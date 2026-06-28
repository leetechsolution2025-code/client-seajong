import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = ["USER", "ADMIN"];

/** PATCH /api/admin/users/[id]/role — Cập nhật role của user */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPERADMIN"].includes(session.user?.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: { role?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newRole = String(body.role ?? "").toUpperCase();
  if (!ALLOWED_ROLES.includes(newRole)) {
    return NextResponse.json(
      { error: `Role không hợp lệ. Cho phép: ${ALLOWED_ROLES.join(", ")}` },
      { status: 422 }
    );
  }

  // Không cho phép sửa SUPERADMIN
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, clientId: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "SUPERADMIN") {
    return NextResponse.json({ error: "Không thể thay đổi quyền của SUPERADMIN" }, { status: 403 });
  }

  // Child project chỉ được sửa user của chính mình
  const callerClientId = session.user?.clientId ?? null;
  if (callerClientId && target.clientId !== callerClientId) {
    return NextResponse.json({ error: "Không có quyền chỉnh sửa user này" }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data:  { role: newRole },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ user: updated });
}
