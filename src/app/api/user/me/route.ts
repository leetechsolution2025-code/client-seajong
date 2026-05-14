import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/** PATCH /api/user/me — cập nhật profile */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, phone } = body;

    // Update User.name
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name?.trim() || undefined },
    });

    // Update Employee.phone nếu có
    const emp = await prisma.employee.findUnique({ where: { userId: session.user.id } });
    if (emp && phone !== undefined) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { phone: phone?.trim() || null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** POST /api/user/me/change-password */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    if (newPassword.length < 8)
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 8 ký tự" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid)
      return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
