import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** PATCH /api/hr/employees/[id]/resign
 *  body: { resign: true | false }
 *  - resign=true  → status="resigned" (block login)
 *  - resign=false → status="active"   (restore)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing employee id" }, { status: 400 });

  let body: { resign?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const resign = body.resign !== false; // default true

  const emp = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, fullName: true, workEmail: true, status: true },
  });
  if (!emp) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

  try {
    const newStatus = resign ? "resigned" : "active";

    await prisma.employee.update({
      where: { id },
      data: { status: newStatus },
    });

    // ── Gửi thông báo toàn hệ thống ──────────────────────────────────────────
    const today = new Date().toLocaleDateString("vi-VN");
    const notifTitle = resign
      ? `Nhân viên ${emp.fullName} đã nghỉ việc`
      : `Nhân viên ${emp.fullName} đã được khôi phục`;
    const notifContent = resign
      ? `${emp.fullName} đã chính thức nghỉ việc kể từ ngày ${today}. Tài khoản đăng nhập hệ thống đã bị khoá.`
      : `${emp.fullName} đã được khôi phục trạng thái làm việc kể từ ngày ${today}. Tài khoản đăng nhập đã được mở lại.`;

    try {
      const notification = await prisma.notification.create({
        data: {
          title:       notifTitle,
          content:     notifContent,
          type:        "info",
          priority:    resign ? "high" : "normal",
          audienceType: "all",
          createdById: (session as { user: { id: string } }).user.id,
        },
      });

      // Gửi cho tất cả user trong hệ thống
      const allUsers = await prisma.user.findMany({ select: { id: true } });
      await Promise.allSettled(
        allUsers.map(u =>
          prisma.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notification.id, userId: u.id } },
            update: {},
            create: { notificationId: notification.id, userId: u.id },
          })
        )
      );
      console.log(`[resign] Notification sent to ${allUsers.length} users`);
    } catch (notifErr) {
      console.warn("[resign] Failed to send notification:", notifErr);
      // Không fail request nếu notification lỗi
    }

    console.log(`[resign] ${emp.fullName} → status=${newStatus}`);

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: resign
        ? `Đã cho nghỉ việc: ${emp.fullName}`
        : `Đã khôi phục: ${emp.fullName}`,
    });
  } catch (err) {
    console.error("[PATCH /api/hr/employees/:id/resign]", err);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
