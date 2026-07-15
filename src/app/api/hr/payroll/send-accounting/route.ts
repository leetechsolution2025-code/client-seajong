import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceData } from "@/components/hr/attendance-actions";
import { createAutoJournal } from "@/lib/accounting-engine";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { month, year } = await req.json();

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    // 1. Find the head of the accounting department (Trưởng phòng Kế toán)
    const accountingManagers = await prisma.employee.findMany({
      where: {
        status: "active",
        OR: [
          { departmentCode: "finance" },
          { departmentName: { contains: "Kế toán" } },
          { departmentName: { contains: "Tài chính" } }
        ],
        position: "vtr-20260401-1964-sbmg" // Trưởng phòng
      },
      select: { userId: true, fullName: true, position: true }
    });

    const validUserIds = Array.from(
      new Set(accountingManagers.map((m) => m.userId).filter(Boolean))
    ) as string[];

    if (validUserIds.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy Trưởng phòng Kế toán để gửi thông báo." },
        { status: 404 }
      );
    }

    // 2. Fetch attendance & payroll data
    const attendanceData = await getAttendanceData(month, year);
    if (!attendanceData || attendanceData.departments.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy dữ liệu bảng lương của tháng này." },
        { status: 404 }
      );
    }

    // 3. Calculate standard workdays
    const daysInMonthCount = new Date(year, month, 0).getDate();
    let sundaysCount = 0;
    for (let d = 1; d <= daysInMonthCount; d++) {
      const day = new Date(year, month - 1, d);
      if (day.getDay() === 0) sundaysCount++;
    }
    const standardWorkDays = daysInMonthCount - sundaysCount || 1;

    // 4. Aggregate payroll information
    let totalEmployees = 0;
    let totalWorkDays = 0;
    let totalBaseSalary = 0;
    let totalAllowances = 0;
    let totalOtSalary = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    interface EmployeePayrollRow {
      fullName: string;
      positionName: string;
      baseSalary: number;
      cong: number;
      allowances: number;
      khauTruBH: number;
      otHours: number;
      otSalary: number;
      net: number;
    }

    const employeePayrolls: EmployeePayrollRow[] = [];

    // Fetch positions categories mapping
    const positionsList = await prisma.category.findMany({
      where: { type: "position" },
      select: { code: true, name: true }
    });
    
    const getPositionLabel = (code: string) => {
      if (!code) return "—";
      const pos = positionsList.find(p => p.code === code);
      return pos ? pos.name : code;
    };

    for (const dept of attendanceData.departments) {
      for (const emp of dept.employees) {
        // Tally attendance
        const cong = emp.attendance.reduce((acc: number, a: any) => acc + (a?.workday || 0), 0);
        const ot = emp.attendance.reduce((acc: number, a: any) => acc + (a?.otHours || 0), 0);
        
        // Base Salary and Allowances
        const salary = emp.baseSalary || 0;
        const allowances = (emp.mealAllowance || 0) + (emp.fuelAllowance || 0) + (emp.phoneAllowance || 0) + (emp.seniorityAllowance || 0);
        
        // Calculate Net
        const salaryTheoCong = (salary / standardWorkDays) * cong;
        const otSalary = ot * (salary / standardWorkDays / 8);
        const khauTruBH = salary * 0.105;
        const net = salaryTheoCong + allowances + otSalary - khauTruBH;

        // Add to totals
        totalEmployees++;
        totalWorkDays += cong;
        totalBaseSalary += salary;
        totalAllowances += allowances;
        totalOtSalary += otSalary;
        totalDeductions += khauTruBH;
        totalNet += net;

        employeePayrolls.push({
          fullName: emp.fullName,
          positionName: getPositionLabel(emp.position),
          baseSalary: salary,
          cong,
          allowances,
          khauTruBH,
          otHours: ot,
          otSalary,
          net
        });
      }
    }

    // 5. Construct notification message
    const senderId = session.user.id;
    const title = `Đề xuất duyệt bảng lương tháng ${month}/${year}`;
    
    const content = `## ĐỀ NGHỊ DUYỆT BẢNG LƯƠNG - THÁNG ${month}/${year}\n\n` +
      `Kính gửi bộ phận Tài chính - Kế toán,\n\n` +
      `Bảng lương tháng ${month}/${year} đã được tổng hợp từ dữ liệu chấm công. Dưới đây là thông tin tổng quan của bảng lương đề xuất:\n\n` +
      `### Thông tin tổng quan:\n` +
      `◦ **Tổng số nhân viên**: ${totalEmployees} người\n` +
      `◦ **Tổng ngày công thực tế**: ${totalWorkDays.toFixed(1)} ngày công\n` +
      `◦ **Tổng Lương CB**: ${Math.round(totalBaseSalary).toLocaleString('vi-VN')} đ\n` +
      `◦ **Tổng Phụ cấp**: ${Math.round(totalAllowances).toLocaleString('vi-VN')} đ\n` +
      `◦ **Tổng Lương OT**: ${Math.round(totalOtSalary).toLocaleString('vi-VN')} đ\n` +
      `◦ **Tổng Khấu trừ BH (10.5%)**: ${Math.round(totalDeductions).toLocaleString('vi-VN')} đ\n\n` +
      `### **TỔNG THỰC LĨNH: ${Math.round(totalNet).toLocaleString('vi-VN')} đồng**\n` +
      `*(Bằng chữ: ${numberToVietnameseWords(totalNet)})*\n\n` +
      `---\n` +
      `Vui lòng nhấn nút **"Xem chi tiết bảng lương"** bên dưới để mở bảng kê khai chi tiết cho từng nhân viên.\n\n` +
      `[ACCOUNTING_PAYROLL_DETAILS]:${JSON.stringify({ month, year })}\n\n` +
      `Trân trọng!`;

    // 6. Create Notification and recipients in a transaction
    const notification = await prisma.$transaction(async (tx) => {
      const notif = await tx.notification.create({
        data: {
          title,
          content,
          type: "info",
          priority: "high",
          audienceType: validUserIds.length > 1 ? "group" : "individual",
          audienceValue: validUserIds.length > 1 ? JSON.stringify(validUserIds) : validUserIds[0],
          createdById: senderId
        }
      });

      await Promise.all(
        validUserIds.map((userId) =>
          tx.notificationRecipient.create({
            data: {
              notificationId: notif.id,
              userId: userId,
              isRead: false
            }
          })
        )
      );

      return notif;
    });

    // [ACCOUNTING ENGINE] Tự động hạch toán Chi phí Lương (PAYROLL_EXPENSE)
    if (totalNet + totalDeductions > 0) {
      await createAutoJournal({
        event: "PAYROLL_EXPENSE",
        amount: Math.round(totalNet + totalDeductions),
        referenceCode: `Lương T${month}/${year}`,
        description: `Hạch toán chi phí lương tháng ${month}/${year}`
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi bảng lương tháng ${month}/${year} tới Trưởng phòng Kế toán.`,
      notificationId: notification.id
    });
  } catch (error: any) {
    console.error("Send to Accounting Error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi nội bộ hệ thống.", details: error.message },
      { status: 500 }
    );
  }
}

function numberToVietnameseWords(num: number): string {
  if (num === 0) return "Không đồng";
  
  const units = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  
  function readThreeDigits(n: number, showZeroHundred: boolean): string {
    let res = "";
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;

    if (hundreds > 0 || showZeroHundred) {
      res += units[hundreds] + " trăm ";
    }

    if (tens > 0) {
      if (tens === 1) {
        res += "mười ";
      } else {
        res += units[tens] + " mươi ";
      }
    } else if (hundreds > 0 || showZeroHundred) {
      if (ones > 0) res += "lẻ ";
    }

    if (ones > 0) {
      if (ones === 1 && tens > 1) {
        res += "mốt ";
      } else if (ones === 5 && tens > 0) {
        res += "lăm ";
      } else if (ones === 4 && tens > 1) {
        res += "tư ";
      } else {
        res += units[ones] + " ";
      }
    }

    return res.trim();
  }

  let temp = Math.round(num);
  let result = "";
  
  const billion = 1000000000;
  const million = 1000000;
  const thousand = 1000;

  const billions = Math.floor(temp / billion);
  temp %= billion;
  
  const millions = Math.floor(temp / million);
  temp %= million;
  
  const thousands = Math.floor(temp / thousand);
  const onesVal = temp % 1000;

  if (billions > 0) {
    result += readThreeDigits(billions, false) + " tỷ ";
  }
  
  if (millions > 0) {
    result += readThreeDigits(millions, billions > 0) + " triệu ";
  } else if (billions > 0 && (thousands > 0 || onesVal > 0)) {
    result += "không trăm triệu ";
  }

  if (thousands > 0) {
    result += readThreeDigits(thousands, billions > 0 || millions > 0) + " nghìn ";
  } else if ((billions > 0 || millions > 0) && onesVal > 0) {
    result += "không nghìn ";
  }

  if (onesVal > 0) {
    result += readThreeDigits(onesVal, billions > 0 || millions > 0 || thousands > 0);
  }

  result = result.replace(/\s+/g, " ").trim();
  
  if (result) {
    result = result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
  }
  return result;
}
