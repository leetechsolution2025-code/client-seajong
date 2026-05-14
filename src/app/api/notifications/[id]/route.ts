import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/notifications/[id] — chỉ người tạo mới được xóa
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });

    if (!notification) {
      return NextResponse.json({ error: "Không tìm thấy thông báo" }, { status: 404 });
    }

    if (notification.createdById !== session.user.id) {
      return NextResponse.json({ error: "Bạn không có quyền xóa thông báo này" }, { status: 403 });
    }

    await prisma.notificationRecipient.deleteMany({ where: { notificationId: id } });
    await prisma.notification.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[DELETE /api/notifications/:id] Error:", err);
    return NextResponse.json({ error: (err as Error)?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
