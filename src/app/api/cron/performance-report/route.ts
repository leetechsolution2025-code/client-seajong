import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Find Directors / Admins
    const directors = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ["admin", "ADMIN", "SUPERADMIN", "superadmin"] } },
          { employee: { level: { contains: "Giám đốc" } } }
        ]
      },
      select: { id: true, name: true }
    });

    if (directors.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy Giám đốc/Admin nào để gửi báo cáo" }, { status: 404 });
    }

    const uniqueDirectorIds = [...new Set(directors.map(d => d.id))];
    const systemId = uniqueDirectorIds[0]; 

    const attachments = [{
      name: `Bao_cao_hieu_suat_Thang_${currentMonth}_${currentYear}.pdf`,
      url: `/board/tasks?view_report=${currentMonth}`,
      type: "pdf" // "pdf" type can trigger appropriate icon in UI if supported, or acts as a visual cue
    }];

    const notification = await prisma.notification.create({
      data: {
        title: `📊 Báo cáo hiệu suất toàn công ty Tháng ${currentMonth}/${currentYear}`,
        content: `Hệ thống đã tự động tổng hợp hiệu suất làm việc của toàn bộ nhân sự trong Tháng ${currentMonth}. Giám đốc vui lòng click vào file đính kèm bên dưới để xem chi tiết Báo cáo.`,
        type: "info",
        priority: "high",
        audienceType: "group",
        audienceValue: JSON.stringify(uniqueDirectorIds),
        attachments: JSON.stringify(attachments),
        createdById: systemId,
      }
    });

    await Promise.allSettled(
      uniqueDirectorIds.map(uid => 
        prisma.notificationRecipient.upsert({
          where: { notificationId_userId: { notificationId: notification.id, userId: uid } },
          update: {},
          create: { notificationId: notification.id, userId: uid },
        })
      )
    );

    return NextResponse.json({ success: true, message: `Đã gửi báo cáo cho ${uniqueDirectorIds.length} người.`, notificationId: notification.id });
  } catch (error) {
    console.error("[CRON] performance-report error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
