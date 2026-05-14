import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { participantId, markAll } = await req.json();
    const userId = session.user.id;

    if (markAll) {
      await prisma.messageParticipant.updateMany({
        where: { userId, isRead: false },
        data:  { isRead: true, readAt: new Date() },
      });
    } else if (participantId) {
      await prisma.messageParticipant.updateMany({
        where: { id: participantId, userId },
        data:  { isRead: true, readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PATCH /api/messages/read] Error:", err);
    return NextResponse.json({ error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
