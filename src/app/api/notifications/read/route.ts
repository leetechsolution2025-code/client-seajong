import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── PATCH: đánh dấu đã đọc (một hoặc tất cả) ────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json();
  const { recipientId, markAll } = body;

  if (markAll) {
    await prisma.notificationRecipient.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  if (recipientId) {
    await prisma.notificationRecipient.updateMany({
      where: { id: recipientId, userId },
      data:  { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Missing recipientId or markAll" }, { status: 400 });
}
