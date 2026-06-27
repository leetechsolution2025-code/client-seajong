import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceData } from "@/components/hr/attendance-actions";

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

    // 1. Fetch attendance & payroll data
    const attendanceData = await getAttendanceData(month, year);
    if (!attendanceData || attendanceData.departments.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy dữ liệu chấm công và lương để duyệt." },
        { status: 404 }
      );
    }

    // 2. Calculate standard workdays
    const daysInMonthCount = new Date(year, month, 0).getDate();
    let sundaysCount = 0;
    for (let d = 1; d <= daysInMonthCount; d++) {
      const day = new Date(year, month - 1, d);
      if (day.getDay() === 0) sundaysCount++;
    }
    const standardWorkDays = daysInMonthCount - sundaysCount || 1;

    // 3. Upsert payroll records for all employees
    await prisma.$transaction(async (tx) => {
      for (const dept of attendanceData.departments) {
        for (const emp of dept.employees) {
          const cong = emp.attendance.reduce((acc: number, a: any) => acc + (a?.workday || 0), 0);
          const ot = emp.attendance.reduce((acc: number, a: any) => acc + (a?.otHours || 0), 0);
          const salary = emp.baseSalary || 0;
          const allowances = (emp.mealAllowance || 0) + (emp.fuelAllowance || 0) + (emp.phoneAllowance || 0) + (emp.seniorityAllowance || 0);
          
          const salaryTheoCong = (salary / standardWorkDays) * cong;
          const otSalary = ot * (salary / standardWorkDays / 8);
          const khauTruBH = salary * 0.105;
          const net = salaryTheoCong + allowances + otSalary - khauTruBH;
          const chiPhiCtyDong = salary * 0.235;
          const tongChiPhiCty = net + chiPhiCtyDong;

          await tx.payroll.upsert({
            where: {
              employeeId_thang_nam: {
                employeeId: emp.id,
                thang: month,
                nam: year
              }
            },
            update: {
              ngayCong: cong,
              gioLamThem: ot,
              luongCoBan: salary,
              phuCap: allowances,
              luongLamThem: otSalary,
              khauTruBH,
              luongThucNhan: net,
              chiPhiCtyDong,
              tongChiPhiCty,
              trangThai: "Kế toán đã duyệt"
            },
            create: {
              employeeId: emp.id,
              thang: month,
              nam: year,
              nguonChamCong: "thu-cong",
              ngayCong: cong,
              gioLamThem: ot,
              luongCoBan: salary,
              phuCap: allowances,
              luongLamThem: otSalary,
              khauTruBH,
              luongThucNhan: net,
              chiPhiCtyDong,
              tongChiPhiCty,
              trangThai: "Kế toán đã duyệt"
            }
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Đã duyệt bảng lương tháng ${month}/${year} thành công. Trạng thái đã được chuyển thành "Kế toán đã duyệt".`
    });
  } catch (error: any) {
    console.error("Approve payroll error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi nội bộ hệ thống khi duyệt bảng lương.", details: error.message },
      { status: 500 }
    );
  }
}
