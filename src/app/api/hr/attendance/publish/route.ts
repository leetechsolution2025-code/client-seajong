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

    // Reuse the existing logic to get attendance data
    const attendanceData = await getAttendanceData(month, year);
    
    if (!attendanceData || attendanceData.departments.length === 0) {
      return NextResponse.json({ error: "No attendance data found" }, { status: 404 });
    }

    const senderId = session.user.id;
    let successCount = 0;

    // Iterate through all employees and send notifications
    for (const dept of attendanceData.departments) {
      for (const emp of dept.employees) {
        if (!emp.userId) continue;

        const công = emp.attendance.reduce((acc: number, a: any) => acc + (a?.workday || 0), 0);
        const phép = emp.attendance.filter((a: any) => a?.code === "P").length;
        const otHours = emp.attendance.reduce((acc: number, a: any) => acc + (a?.otHours || 0), 0);
        const vắng = emp.attendance.filter((a: any) => a?.code === "-").length;
        const cơmTrưa = emp.attendance.filter((a: any) => a?.registeredLunch).length;
        const cơmTối = emp.attendance.filter((a: any) => a?.registeredDinner).length;

        const title = `Phiếu xác nhận công tháng ${month}/${year}`;
        const content = `## TỔNG HỢP CÔNG THÁNG ${month}/${year}\n` +
          `Chào **${emp.fullName}**,\n\n` +
          `Phòng Nhân sự gửi bạn bảng tổng hợp công chi tiết. Vui lòng kiểm tra các số liệu sau:\n\n` +
          `◦ **Tổng công thực tế**: ${công.toFixed(2)} ngày (bao gồm ngày lễ & phép)\n` +
          `◦ **Nghỉ phép (có lương)**: ${phép} ngày\n` +
          `◦ **Tăng ca (OT)**: ${otHours.toFixed(1)} giờ (đã nhân hệ số)\n` +
          `◦ **Vắng/Chưa chấm**: ${vắng} ngày\n` +
          `◦ **Số suất cơm trưa**: ${cơmTrưa} suất\n` +
          `◦ **Số suất cơm tối**: ${cơmTối} suất\n\n` +
          `--- \n` +
          `**Lưu ý**: Nhấn nút "Chi tiết" bên dưới để xem bảng chấm công từng ngày. Nếu có sai sót, vui lòng phản hồi trước ngày 05 tháng sau.\n` +
          `[ATTENDANCE_DETAILS]:${JSON.stringify({ month, year, employeeId: emp.id })}\n\n` +
          `Trân trọng!`;

        await notifyUser(emp.userId, title, content, senderId);
        successCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Đã phát hành phiếu công cho ${successCount} nhân viên.`,
      count: successCount 
    });

  } catch (error: any) {
    console.error("Publish Attendance Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
