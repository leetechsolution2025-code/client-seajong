import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceData } from "@/components/hr/attendance-actions";
import { notifyUser } from "@/lib/hr-notifications";

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

    // Reuse the existing logic to get attendance and salary data
    const attendanceData = await getAttendanceData(month, year);
    
    if (!attendanceData || attendanceData.departments.length === 0) {
      return NextResponse.json({ error: "No payroll data found" }, { status: 404 });
    }

    // Get standard work days from labor policy
    let standardWorkDays = 26; // Default fallback
    const policy = await (prisma as any).laborPolicy.findFirst({
      where: { type: "work_hours" } // Assuming work_hours policy stores this info
    });
    
    if (policy && policy.content) {
      try {
        const parsed = JSON.parse(policy.content);
        if (parsed.standardWorkDays) {
          standardWorkDays = Number(parsed.standardWorkDays);
        }
      } catch (e) {}
    }

    const senderId = session.user.id;
    let successCount = 0;

    // Iterate through all employees and send payroll notifications
    for (const dept of attendanceData.departments) {
      for (const emp of dept.employees) {
        if (!emp.userId) continue;

        // Tally attendance
        const cong = emp.attendance.reduce((acc: number, a: any) => acc + (a?.workday || 0), 0);
        
        // Base Salary and Allowances
        const salary = emp.baseSalary || 0;
        const allowances = (emp.mealAllowance || 0) + (emp.fuelAllowance || 0) + (emp.phoneAllowance || 0) + (emp.seniorityAllowance || 0);
        
        // Calculate Net
        const salaryTheoCong = (salary / standardWorkDays) * cong;
        const net = salaryTheoCong + allowances;

        const title = `Phiếu lương tháng ${month}/${year}`;
        const content = `## THÔNG BÁO CHI TRẢ THU NHẬP THÁNG ${month}/${year}\n` +
          `Chào **${emp.fullName}**,\n\n` +
          `Phòng Nhân sự & Kế toán gửi bạn thông tin bảng lương chi tiết. Vui lòng kiểm tra các khoản thu nhập bên dưới:\n\n` +
          `◦ **Lương cơ bản**: ${Math.round(salary).toLocaleString('vi-VN')} đ\n` +
          `◦ **Ngày công thực tế**: ${cong.toFixed(2)} ngày\n` +
          `◦ **Phụ cấp & Thưởng**: ${Math.round(allowances).toLocaleString('vi-VN')} đ\n` +
          `◦ **Khấu trừ (phạt, bảo hiểm)**: 0 đ\n` +
          `◦ **Tăng ca (OT)**: 0 đ\n\n` +
          `---\n` +
          `### **THỰC LĨNH: ${Math.round(net).toLocaleString('vi-VN')} đ**\n\n` +
          `**Lưu ý**: Nhấn nút "Chi tiết" bên dưới để xem bảng kê khai phụ cấp và chi tiết công thức tính. Nếu có thắc mắc, vui lòng liên hệ phòng Kế toán nội bộ trước ngày 10 tháng sau.\n` +
          `[PAYROLL_DETAILS]:${JSON.stringify({ month, year, employeeId: emp.id })}\n\n` +
          `Trân trọng!`;

        await notifyUser(emp.userId, title, content, senderId);
        successCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Đã phát hành phiếu lương cho ${successCount} nhân viên.`,
      count: successCount 
    });

  } catch (error: any) {
    console.error("Publish Payroll Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
