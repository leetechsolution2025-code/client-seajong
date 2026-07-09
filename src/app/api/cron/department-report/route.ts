import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Find all employees that have a linked User account
    const employees = await prisma.employee.findMany({
      where: { userId: { not: null } },
      select: { userId: true, departmentCode: true, departmentName: true }
    });

    if (employees.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy nhân viên nào có tài khoản liên kết" }, { status: 404 });
    }

    // Group employees by department
    const deptGroups: Record<string, { name: string, userIds: string[] }> = {};
    for (const emp of employees) {
      if (!emp.departmentCode || !emp.userId) continue;
      if (!deptGroups[emp.departmentCode]) {
        deptGroups[emp.departmentCode] = { name: emp.departmentName || emp.departmentCode, userIds: [] };
      }
      deptGroups[emp.departmentCode].userIds.push(emp.userId);
    }

    // Identify a system admin to be the creator of the notification
    const systemAdmins = await prisma.user.findMany({
      where: { role: { in: ["admin", "ADMIN", "SUPERADMIN", "superadmin"] } },
      select: { id: true }
    });
    const systemId = systemAdmins.length > 0 ? systemAdmins[0].id : employees[0].userId!;

    const notificationIds = [];

    // Create a notification for each department
    for (const [deptCode, deptInfo] of Object.entries(deptGroups)) {
      const uniqueUserIds = [...new Set(deptInfo.userIds)];
      if (uniqueUserIds.length === 0) continue;

      const attachments = [{
        name: `Bao_cao_hieu_suat_Phòng_${deptInfo.name.replace(/\\s+/g, "_")}_Thang_${currentMonth}_${currentYear}.pdf`,
        url: `/board/tasks?view_report=${currentMonth}&dept=${deptCode}`,
        type: "pdf"
      }];

      const notification = await prisma.notification.create({
        data: {
          title: `📊 Báo cáo hiệu suất phòng ${deptInfo.name} Tháng ${currentMonth}/${currentYear}`,
          content: `Hệ thống đã tự động tổng hợp hiệu suất làm việc của nhân sự phòng ${deptInfo.name} trong Tháng ${currentMonth}. Trưởng phòng và các thành viên vui lòng click vào file đính kèm bên dưới để xem chi tiết Báo cáo.`,
          type: "info",
          priority: "high",
          audienceType: "group",
          audienceValue: JSON.stringify(uniqueUserIds),
          attachments: JSON.stringify(attachments),
          createdById: systemId,
        }
      });
      
      notificationIds.push(notification.id);

      await Promise.allSettled(
        uniqueUserIds.map(uid => 
          prisma.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notification.id, userId: uid } },
            update: {},
            create: { notificationId: notification.id, userId: uid },
          })
        )
      );
    }

    return NextResponse.json({ success: true, message: `Đã gửi báo cáo cho ${Object.keys(deptGroups).length} phòng ban.`, notifications: notificationIds });
  } catch (error) {
    console.error("[CRON] department-report error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
