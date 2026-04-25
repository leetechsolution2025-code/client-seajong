import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plan-finance/inventory/stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [all, sapHet, hetHang, categories] = await Promise.all([
      prisma.inventoryItem.findMany({
        select: { soLuong: true, giaNhap: true, trangThai: true },
      }),
      prisma.inventoryItem.count({ where: { trangThai: "sap-het" } }),
      prisma.inventoryItem.count({ where: { trangThai: "het-hang" } }),
      prisma.inventoryCategory.findMany({
        where:   { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { items: true } },
          items:  { select: { soLuong: true, giaNhap: true } },
        },
      }),
    ]);

    const tongMatHang = all.length;
    const tongGiaTri  = all.reduce((s: number, it: { soLuong: number; giaNhap: number }) => s + it.soLuong * it.giaNhap, 0);
    type CatRaw = { name: string; _count: { items: number }; items: { soLuong: number; giaNhap: number }[] };
    const categoryStats = categories.map((c: CatRaw) => ({
      label: c.name,
      value: c._count.items,
    }));
    const categoryValueStats = categories.map((c: CatRaw) => ({
      label: c.name,
      value: Math.round(c.items.reduce((s, it) => s + it.soLuong * it.giaNhap, 0)),
    }));

    return NextResponse.json({ tongMatHang, tongGiaTri, sapHet, hetHang, categoryStats, categoryValueStats });
  } catch (e) {
    console.error("[GET /inventory/stats]", e);
    return NextResponse.json({ tongMatHang: 0, tongGiaTri: 0, sapHet: 0, hetHang: 0 });
  }
}
