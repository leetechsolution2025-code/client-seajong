import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — Danh sách users với permissions + deptAccess
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawUsers = await prisma.user.findMany({
    where: { role: { not: "SUPERADMIN" } },
    include: {
      employee: { select: { departmentCode: true, position: true, fullName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  // Loại bỏ password trước khi trả về client
  const users = rawUsers.map(({ password: _pw, ...u }) => u);
  return NextResponse.json(users);
}

// PUT — Cập nhật permissions và deptAccess cho user
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role as string))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { userId, permissions, deptAccess, role } = await req.json();
    if (!userId) return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions);
    if (deptAccess !== undefined) updateData.deptAccess = JSON.stringify(deptAccess);
    if (role !== undefined && ["ADMIN", "USER"].includes(role)) {
      if (userId === (session.user as any).id) return NextResponse.json({ error: "Không thể thay đổi quyền của chính mình" }, { status: 400 });
      updateData.role = role;
    }

    const user = await prisma.user.update({ where: { id: userId }, data: updateData }) as any;
    return NextResponse.json({ id: user.id, role: user.role, permissions: user.permissions, deptAccess: user.deptAccess });
  } catch (e) {
    console.error("[PUT /api/company/permissions]", e);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
