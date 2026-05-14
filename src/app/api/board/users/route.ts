import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/board/users — danh sách user kèm permissions & deptAccess */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: "SUPERADMIN" } },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, email: true, role: true,
        permissions: true, deptAccess: true, createdAt: true,
        employee: {
          select: {
            departmentName: true, departmentCode: true,
            position: true, status: true, phone: true,
          },
        },
      },
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error("[GET /api/board/users]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
