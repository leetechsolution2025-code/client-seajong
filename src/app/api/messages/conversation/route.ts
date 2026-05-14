import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/messages/conversation?with=<userId>
 * Trả về toàn bộ lịch sử hội thoại giữa current user và <userId>
 * Bao gồm: tin current user gửi đến <userId> và tin <userId> gửi đến current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const withUserId = searchParams.get("with");
    if (!withUserId) {
      return NextResponse.json({ error: "Missing `with` param" }, { status: 400 });
    }

    const currentUserId = session.user.id;
    const clientId      = session.user?.clientId ?? null;

    // Lấy tất cả tin nhắn mà cả currentUser và withUser đều là participant
    // (bao gồm cả tin gửi và tin nhận cho cả 2 chiều)
    const messages = await prisma.message.findMany({
      where: {
        clientId,
        isDeleted: false,
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: withUserId } } },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            employee: { select: { fullName: true, departmentName: true, position: true } },
          },
        },
        participants: {
          where: { userId: currentUserId },
          select: { isRead: true, readAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const thread = messages.map((m) => {
      const emp = m.sender?.employee;
      return {
        id:          m.id,
        content:     m.content,
        attachments: m.attachments ? JSON.parse(m.attachments as string) : [],
        createdAt:   m.createdAt,
        senderId:    m.senderId,
        senderName:  emp?.fullName || m.sender?.name || "Hệ thống",
        isSentByMe:  m.senderId === currentUserId,
        isRead:      m.participants[0]?.isRead ?? true,
      };
    });

    return NextResponse.json({ thread });
  } catch (err: any) {
    console.error("[GET /api/messages/conversation]", err);
    return NextResponse.json({ error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
