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
      select: { userId: true, fullName: true, departmentCode: true, departmentName: true }
    });

    if (employees.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy nhân viên nào có tài khoản liên kết" }, { status: 404 });
    }

    const userIds = employees.map(e => e.userId!);

    // Count generic tasks
    const tasksCount = await prisma.task.groupBy({
      by: ['assigneeId'],
      where: {
        assigneeId: { in: userIds },
        dueDate: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        }
      },
      _count: { id: true }
    });

    const userNames = employees.map(e => e.fullName);

    // Count marketing tasks
    const mktTasksCount = await prisma.marketingTask.groupBy({
      by: ['assigneeName'],
      where: {
        assigneeName: { in: userNames },
        OR: [
          { monthlyPlan: { month: currentMonth } },
          {
            deadline: {
              gte: new Date(currentYear, currentMonth - 1, 1),
              lt: new Date(currentYear, currentMonth, 1)
            }
          }
        ]
      },
      _count: { id: true }
    });

    // Merge counts
    const userTaskCounts: Record<string, number> = {};
    for (const u of userIds) userTaskCounts[u] = 0;

    for (const t of tasksCount) {
      userTaskCounts[t.assigneeId] = (userTaskCounts[t.assigneeId] || 0) + t._count.id;
    }
    for (const t of mktTasksCount) {
      if (!t.assigneeName) continue;
      const emp = employees.find(e => e.fullName === t.assigneeName);
      if (emp) {
        userTaskCounts[emp.userId!] = (userTaskCounts[emp.userId!] || 0) + t._count.id;
      }
    }

    // Identify a system admin to be the creator of the notification
    const systemAdmins = await prisma.user.findMany({
      where: { role: { in: ["admin", "ADMIN", "SUPERADMIN", "superadmin"] } },
      select: { id: true }
    });
    const systemId = systemAdmins.length > 0 ? systemAdmins[0].id : userIds[0];

    const notificationIds = [];

    // Create notifications for each employee
    for (const emp of employees) {
      const uId = emp.userId!;
      const count = userTaskCounts[uId] || 0;
      
      let title = `📊 Báo cáo hiệu suất cá nhân Tháng ${currentMonth}/${currentYear}`;
      let content = "";
      let attachments: any[] = [];

      if (count > 0) {
        content = `Hệ thống đã tự động tổng hợp hiệu suất làm việc của bạn trong Tháng ${currentMonth}. Vui lòng click vào file đính kèm bên dưới để xem chi tiết Báo cáo và danh sách công việc.`;
        attachments = [{
          name: `Bao_cao_hieu_suat_ca_nhan_Thang_${currentMonth}_${currentYear}.pdf`,
          url: `/board/tasks?view_report=${currentMonth}&dept=${emp.departmentCode || ""}&emp=${encodeURIComponent(emp.fullName)}`,
          type: "pdf"
        }];
      } else {
        content = `Trong Tháng ${currentMonth}, hệ thống ghi nhận bạn **không có công việc nào** được giao trên hệ thống quản trị. Nếu có sai sót, vui lòng liên hệ với Trưởng bộ phận để kiểm tra lại.`;
        attachments = [];
      }

      const notification = await prisma.notification.create({
        data: {
          title,
          content,
          type: count > 0 ? "info" : "warning",
          priority: "high",
          audienceType: "individual",
          audienceValue: JSON.stringify([uId]),
          attachments: JSON.stringify(attachments),
          createdById: systemId,
        }
      });
      
      notificationIds.push(notification.id);

      await prisma.notificationRecipient.upsert({
        where: { notificationId_userId: { notificationId: notification.id, userId: uId } },
        update: {},
        create: { notificationId: notification.id, userId: uId },
      });
    }

    return NextResponse.json({ success: true, message: `Đã gửi báo cáo cá nhân cho ${employees.length} nhân sự.`, count: employees.length });
  } catch (error) {
    console.error("[CRON] individual-report error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
