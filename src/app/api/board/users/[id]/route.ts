import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_PERMS = [
  "crm", "chat", "notify", "task", "report", "plan", "approve_request", "approve_budget",
];
const VALID_LEVELS = ["none", "view", "full"];

/** PATCH /api/board/users/[id] — cập nhật role, permissions, deptAccess */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
    if (target.role === "SUPERADMIN")
      return NextResponse.json({ error: "Không thể phân quyền SUPERADMIN" }, { status: 403 });

    const data: Record<string, unknown> = {};

    if (body.role && ["USER", "ADMIN"].includes(body.role)) {
      data.role = body.role;
    }
    if (Array.isArray(body.permissions)) {
      data.permissions = JSON.stringify(body.permissions.filter((p: string) => VALID_PERMS.includes(p)));
    }
    if (Array.isArray(body.deptAccess)) {
      const cleaned = body.deptAccess
        .filter((d: { code: string; level: string }) => d.code && VALID_LEVELS.includes(d.level))
        .map((d: { code: string; level: string }) => ({ code: d.code, level: d.level }));
      data.deptAccess = JSON.stringify(cleaned);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, permissions: true, deptAccess: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/board/users/[id]]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
