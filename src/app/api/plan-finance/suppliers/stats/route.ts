import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plan-finance/suppliers/stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [total, active, categories] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.count({ where: { trangThai: "active" } }),
      // Đếm số NCC per danh mục từ join table SupplierCategory
      prisma.inventoryCategory.findMany({
        where:   { isActive: true },
        orderBy: { sortOrder: "asc" },
        select:  {
          name:      true,
          _count:    { select: { suppliers: true } },
        },
      }),
    ]);

    const categoryStats = (categories as { name: string; _count: { suppliers: number } }[])
      .map(c => ({ label: c.name, value: c._count.suppliers }));

    return NextResponse.json({ total, active, categoryStats });
  } catch (e) {
    console.error("[GET /suppliers/stats]", e);
    return NextResponse.json({ total: 0, active: 0, categoryStats: [] });
  }
}
