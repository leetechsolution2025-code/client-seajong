import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/admin/users/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      employee: {
        select: {
          code: true, fullName: true, gender: true, phone: true, workEmail: true,
          departmentCode: true, departmentName: true, position: true, level: true,
          status: true, startDate: true,
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

/** PATCH /api/admin/users/[id] — cập nhật name, role */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Không cho sửa SUPERADMIN
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "SUPERADMIN")
    return NextResponse.json({ error: "Không thể chỉnh sửa SUPERADMIN" }, { status: 403 });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.role && { role: body.role }),
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return NextResponse.json(updated);
}

/** DELETE /api/admin/users/[id] — xoá user + employee */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPERADMIN")
    return NextResponse.json({ error: "Chỉ SUPERADMIN mới được xoá nhân viên" }, { status: 403 });

  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, email: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "SUPERADMIN")
    return NextResponse.json({ error: "Không thể xoá tài khoản SUPERADMIN" }, { status: 403 });

  // Xoá cascade thủ công
  await prisma.notificationRecipient.deleteMany({ where: { userId: id } });
  await prisma.messageParticipant.deleteMany({ where: { userId: id } });
  await prisma.employee.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
