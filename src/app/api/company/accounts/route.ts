import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — Danh sách tài khoản
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { role: { not: "SUPERADMIN" } },
    select: { id: true, email: true, name: true, role: true, createdAt: true,
      employee: { select: { departmentCode: true, position: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

// PUT — Đổi mật khẩu
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { userId, newPassword } = await req.json();
    if (!userId || !newPassword) return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: "Mật khẩu tối thiểu 6 ký tự" }, { status: 400 });

    const bcrypt = await import("bcryptjs");
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[PUT /api/company/accounts]", e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// PATCH — Toggle role ADMIN/USER
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { userId, role } = await req.json();

    // Debug log
    console.log("[PATCH /api/company/accounts]", {
      callerRole: session.user?.role,
      callerId: (session.user as any).id,
      targetUserId: userId,
      requestedRole: role,
      isSelf: userId === (session.user as any).id,
    });

    if (!userId || !["ADMIN", "USER"].includes(role))
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    if (userId === (session.user as any).id)
      return NextResponse.json({ error: "Không thể thay đổi vai trò của chính mình" }, { status: 400 });

    const user = await prisma.user.update({ where: { id: userId }, data: { role } });
    return NextResponse.json({ id: user.id, role: user.role });
  } catch (e) {
    console.error("[PATCH /api/company/accounts]", e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
