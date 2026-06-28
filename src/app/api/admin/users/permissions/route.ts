import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_PERMISSIONS = [
  "crm", "chat", "notify", "task", "report", "plan", "approve_request", "approve_budget",
];

/** PATCH /api/admin/users/permissions — Batch cập nhật permissions cho nhiều users */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPERADMIN"].includes(session.user?.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const callerClientId = session.user?.clientId ?? null;

  let body: { updates: { id: string; permissions: string[] }[] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.updates) || body.updates.length === 0) {
    return NextResponse.json({ error: "updates phải là mảng không rỗng" }, { status: 422 });
  }

  // Validate & sanitize
  const updates = body.updates.map(u => ({
    id:          String(u.id),
    permissions: (u.permissions ?? [])
      .filter((p: string) => VALID_PERMISSIONS.includes(p)),
  }));

  // Kiểm tra quyền client
  const userIds = updates.map(u => u.id);
  const targets = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, role: true, clientId: true },
  });

  for (const t of targets) {
    if (t.role === "SUPERADMIN") {
      return NextResponse.json({ error: "Không thể sửa quyền SUPERADMIN" }, { status: 403 });
    }
    if (callerClientId && t.clientId !== callerClientId) {
      return NextResponse.json({ error: `Không có quyền sửa user ${t.id}` }, { status: 403 });
    }
  }

  // Batch update
  await Promise.all(
    updates.map(u =>
      prisma.user.update({
        where: { id: u.id },
        data:  { permissions: JSON.stringify(u.permissions) },
      })
    )
  );

  return NextResponse.json({ updated: updates.length });
}
