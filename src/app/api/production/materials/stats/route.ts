import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeVietnameseTones } from "@/lib/utils";
import { Prisma } from "@prisma/client";

type MaterialItemWithStocks = Prisma.MaterialItemGetPayload<{
  include: { stocks: { select: { soLuong: true; soLuongMin: true } } };
}>;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId") ?? "";
    const categoryId  = searchParams.get("categoryId")  ?? "";
    const search      = searchParams.get("search")      ?? "";

    const where: any = {
      ...(categoryId && { categoryId }),
    };

    if (warehouseId) {
      where.stocks = { some: { warehouseId } };
    }

    const [rawItems, categories] = await Promise.all([
      prisma.materialItem.findMany({
        where,
        include: {
          stocks: warehouseId 
            ? { where: { warehouseId }, select: { soLuong: true, soLuongMin: true } }
            : { select: { soLuong: true, soLuongMin: true } },
        },
      }) as Promise<MaterialItemWithStocks[]>,
      prisma.inventoryCategory.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      }),
    ]);

    const searchNorm = removeVietnameseTones(search);
    const filteredItems = search
      ? rawItems.filter((it: MaterialItemWithStocks) => {
          const nameNorm = removeVietnameseTones(it.name);
          const codeNorm = removeVietnameseTones(it.code ?? "");
          return nameNorm.includes(searchNorm) || codeNorm.includes(searchNorm);
        })
      : rawItems;

    let tongGiaTri = 0;
    let hetHang = 0;
    let sapHet = 0;

    const itemsWithLiveStats = filteredItems.map((item: MaterialItemWithStocks) => {
      const soLuongThuc = item.stocks.reduce((sum: number, s: any) => sum + s.soLuong, 0);
      const soLuongMinTotal = item.stocks.reduce((sum: number, s: any) => sum + s.soLuongMin, 0);
      
      tongGiaTri += (soLuongThuc * item.price);

      if (soLuongThuc <= 0) {
        hetHang++;
      } else if (soLuongMinTotal > 0 && soLuongThuc <= soLuongMinTotal) {
        sapHet++;
      }

      return { ...item, soLuongThuc };
    });

    const tongMatHang = filteredItems.length;

    const categoryStats = categories.map(cat => {
      const catItems = itemsWithLiveStats.filter(it => it.categoryId === cat.id);
      const value = catItems.reduce((sum, it) => sum + (it.soLuongThuc * it.price), 0);
      return {
        label: cat.name,
        value: Math.round(value)
      };
    }).filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({ 
      tongMatHang, 
      tongGiaTri, 
      hetHang, 
      sapHet, 
      categoryStats 
    });
  } catch (e) {
    console.error("[GET /api/production/materials/stats]", e);
    return NextResponse.json({ 
      tongMatHang: 0, 
      tongGiaTri: 0, 
      hetHang: 0, 
      sapHet: 0, 
      categoryStats: [] 
    }, { status: 500 });
  }
}
