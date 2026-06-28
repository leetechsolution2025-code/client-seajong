import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/admin/users — Danh sách users (filter theo clientId nếu child project) */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "SUPERADMIN"].includes(session.user?.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search     = searchParams.get("search")     ?? "";
    const department = searchParams.get("department") ?? "";
    const role       = searchParams.get("role")       ?? "";
    const page       = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit      = parseInt(searchParams.get("limit") ?? "20");
    const skip       = (page - 1) * limit;

    const where = {
      role:     { not: "SUPERADMIN" as const },
      ...(role       ? { role: role as "USER" | "ADMIN" }                                         : {}),
      ...(search     ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }  : {}),
      ...(department ? { employee: { departmentCode: department } }                               : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id:        true,
          name:      true,
          email:     true,
          role:      true,
          createdAt: true,
          employee: {
            select: {
              code:           true,
              departmentName: true,
              position:       true,
              level:          true,
              status:         true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e: unknown) {
    console.error("[GET /api/admin/users]", e);
    return NextResponse.json(
      { error: "Lỗi server", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
