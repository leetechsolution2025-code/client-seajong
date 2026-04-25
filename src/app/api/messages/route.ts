import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET: lấy danh sách tin nhắn của user hiện tại ────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    const participants = await prisma.messageParticipant.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        message: {
          select: {
            id: true,
            content: true,
            attachments: true,
            isDeleted: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                name: true,
                employee: {
                  select: { fullName: true, departmentName: true, position: true },
                },
              },
            },
            // Số người nhận + lấy partner (người còn lại trong hội thoại)
            participants: {
              select: { userId: true },
            },
          },
        },
      },
    });

    const unreadCount = participants.filter((p: any) => !p.isRead).length;

    return NextResponse.json({
      messages: participants.map((p: any) => {
        const msg = p.message;
        const emp = msg.sender?.employee;
        const senderId = msg.sender?.id ?? null;
        // partnerUserId: với tin nhận thì là senderId, với tin gửi thì là participant đầu tiên khác sender
        const otherParticipants: string[] = (msg.participants as Array<{userId: string}>)
          .map((pp) => pp.userId)
          .filter((uid: string) => uid !== senderId);
        const partnerUserId = senderId === p.userId
          ? (otherParticipants[0] ?? null)   // mình gửi → partner là người nhận
          : senderId;                          // mình nhận → partner là sender

        return {
          participantId:    p.id,
          isRead:           p.isRead,
          readAt:           p.readAt,
          id:               msg.id,
          content:          msg.isDeleted ? "[Tin nhắn đã bị xóa]" : msg.content,
          attachments:      msg.isDeleted ? [] : (msg.attachments ? JSON.parse(msg.attachments) : []),
          isDeleted:        msg.isDeleted,
          createdAt:        msg.createdAt,
          recipientCount:   msg.participants.length,
          senderId,
          senderName:       emp?.fullName || msg.sender?.name || "Hệ thống",
          senderDept:       emp?.departmentName || null,
          senderPos:        emp?.position || null,
          partnerUserId,
        };
      }),
      unreadCount,
    });
  } catch (err: any) {
    console.error("[GET /api/messages] Error:", err);
    return NextResponse.json({ error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

// ── POST: gửi tin nhắn mới ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { content, audienceType = "individual", audienceValue, attachments } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Nội dung không được để trống" }, { status: 400 });
    }

    // Tạo message record
    const message = await prisma.message.create({
      data: {
        content:     content.trim(),
        attachments: attachments ? JSON.stringify(attachments) : null,
        senderId:    session.user.id,
        clientId:    null,
      },
    });

    // Xác định danh sách userIds đích (không bao gồm sender)
    let userIds: string[] = [];
    const senderId = session.user.id;

    if (audienceType === "all") {
      const users = await prisma.user.findMany({ select: { id: true } });
      userIds = users.map((u: any) => u.id).filter((id: string) => id !== senderId);

    } else if (audienceType === "department" && audienceValue) {
      const employees = await prisma.employee.findMany({
        where: { departmentCode: audienceValue },
        select: { userId: true },
      });
      userIds = employees
        .map((e: any) => e.userId)
        .filter((id: string | null): id is string => Boolean(id) && id !== senderId);

    } else if (audienceType === "individual" && audienceValue) {
      userIds = [audienceValue].filter((id: string) => id !== senderId);

    } else if (audienceType === "group" && audienceValue) {
      try {
        const parsed = JSON.parse(audienceValue);
        userIds = (Array.isArray(parsed) ? parsed : []).filter((id: string) => id !== senderId);
      } catch { userIds = []; }
    }

    // Thêm sender vào participant (để sender cũng thấy tin nhắn trong list)
    const allIds = [...new Set([senderId, ...userIds])];

    if (allIds.length > 0) {
      await Promise.allSettled(
        allIds.map((uid: string) =>
          prisma.messageParticipant.upsert({
            where: { messageId_userId: { messageId: message.id, userId: uid } },
            update: {},
            create: {
              messageId: message.id,
              userId: uid,
              // Sender đã "đọc" ngay lập tức
              isRead: uid === senderId,
              readAt: uid === senderId ? new Date() : null,
            },
          })
        )
      );
    }

    return NextResponse.json({
      success:        true,
      messageId:      message.id,
      recipientCount: userIds.length,
    });

  } catch (err: any) {
    console.error("[POST /api/messages] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Lỗi máy chủ nội bộ" },
      { status: 500 }
    );
  }
}
