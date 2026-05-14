import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET: lấy danh sách thông báo của user hiện tại ───────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    const recipients = await prisma.notificationRecipient.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        notification: {
          select: {
            id: true, title: true, content: true,
            type: true, priority: true, audienceType: true,
            attachments: true, createdAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                employee: {
                  select: { fullName: true, departmentName: true, position: true },
                },
              },
            },
          },
        },
      },
    });

    // Lấy danh mục chức vụ để map code sang name
    const positions = await prisma.category.findMany({
      where: { type: "position" },
      select: { code: true, name: true }
    });
    const posMap = Object.fromEntries(positions.map(p => [p.code, p.name]));

    const unreadCount = recipients.filter((r: any) => !r.isRead).length;

    return NextResponse.json({
      notifications: recipients.map((r: any) => {
        const nb = r.notification;
        const creatorEmployee = nb.createdBy?.employee;
        const rawPos = creatorEmployee?.position || null;
        const displayPos = rawPos ? (posMap[rawPos] || rawPos) : null;

        return {
          recipientId:    r.id,
          isRead:         r.isRead,
          readAt:         r.readAt,
          id:             nb.id,
          title:          nb.title,
          content:        nb.content,
          type:           nb.type,
          priority:       nb.priority ?? "normal",
          audienceType:   nb.audienceType,
          createdAt:      nb.createdAt,
          attachments:    nb.attachments ? JSON.parse(nb.attachments) : [],
          createdById:    nb.createdBy?.id ?? null,
          createdByName:  creatorEmployee?.fullName || nb.createdBy?.name || "Hệ thống",
          createdByDept:  creatorEmployee?.departmentName || null,
          createdByPos:   displayPos,
        };
      }),
      unreadCount,
    });
  } catch (err: any) {
    console.error("[GET /api/notifications] Error:", err);
    return NextResponse.json({ error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

// ── POST: tạo thông báo mới ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      title, content,
      type        = "info",
      priority    = "normal",
      audienceType  = "all",
      audienceValue,
      attachments,
    } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Thiếu tiêu đề hoặc nội dung" }, { status: 400 });
    }

    // Tạo notification record
    const notification = await prisma.notification.create({
      data: {
        title:         title.trim(),
        content:       content.trim(),
        type,
        priority,
        audienceType,
        audienceValue: audienceValue ?? null,
        attachments:   attachments ? JSON.stringify(attachments) : null,
        clientId:      null,
        createdById:   session.user.id,
      },
    });

    // Xác định danh sách userIds
    let userIds: string[] = [];

    if (audienceType === "all") {
      const users = await prisma.user.findMany({ select: { id: true } });
      userIds = users.map((u: any) => u.id);

    } else if (audienceType === "department" && audienceValue) {
      const employees = await prisma.employee.findMany({
        where: { departmentCode: audienceValue },
        select: { userId: true },
      });
      userIds = employees.map((e: any) => e.userId).filter(Boolean) as string[];

    } else if (audienceType === "individual" && audienceValue) {
      userIds = [audienceValue];

    } else if (audienceType === "group" && audienceValue) {
      try {
        const parsed = JSON.parse(audienceValue);
        userIds = Array.isArray(parsed) ? parsed : [];
      } catch { userIds = []; }
    }

    // Tạo NotificationRecipient (upsert – SQLite không hỗ trợ skipDuplicates)
    const uniqueIds = [...new Set(userIds)].filter(Boolean);
    if (uniqueIds.length > 0) {
      await Promise.allSettled(
        uniqueIds.map((uid: string) =>
          prisma.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notification.id, userId: uid } },
            update: {},
            create: { notificationId: notification.id, userId: uid },
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      recipientCount: uniqueIds.length,
    });

  } catch (err: any) {
    console.error("[POST /api/notifications] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Lỗi máy chủ nội bộ" },
      { status: 500 }
    );
  }
}
