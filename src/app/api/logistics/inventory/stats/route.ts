import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeVietnameseTones } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mode        = searchParams.get("mode");
    const warehouseId = searchParams.get("warehouseId") ?? "";
    const categoryId  = searchParams.get("categoryId")  ?? "";
    const search      = searchParams.get("search")      ?? "";

    const where: any = {};
    if (warehouseId) {
      where.stocks = { some: { warehouseId } };
    }

    if (categoryId) {
      if (warehouseId) {
        const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { type: true, code: true } });
        if (wh && (wh.type === "MATERIAL" || wh.code === "KVP")) {
          const selectedCat = await prisma.category.findUnique({ where: { id: categoryId } });
          if (selectedCat && selectedCat.code) {
            where.maThayThe = { startsWith: selectedCat.code };
          } else {
            where.erpCategoryId = categoryId;
          }
        } else {
          const allCategoryIds = await getCategoryIdsRecursive(categoryId);
          where.categoryId = { in: allCategoryIds };
        }
      } else {
        const allCategoryIds = await getCategoryIdsRecursive(categoryId);
        where.OR = [
          { categoryId: { in: allCategoryIds } },
          { erpCategoryId: categoryId }
        ];
      }
    }

    const [rawItems, erpCats, invCats] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          stocks: warehouseId 
            ? { where: { warehouseId }, select: { soLuong: true, soLuongMin: true } }
            : { select: { soLuong: true, soLuongMin: true } },
          category: { select: { name: true } },
          erpCategory: { select: { name: true } }
        },
      }),
      prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      prisma.inventoryCategory.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    ]);

    const searchNorm = removeVietnameseTones(search);
    const filteredItems = search
      ? rawItems.filter(it => {
          const nameNorm = removeVietnameseTones(it.tenHang);
          const codeNorm = removeVietnameseTones(it.code ?? "");
          return nameNorm.includes(searchNorm) || codeNorm.includes(searchNorm);
        })
      : rawItems;

    const priceField = mode === "production" ? "giaBan" : "giaNhap";

    let tongGiaTri = 0;
    let hetHang = 0;
    let sapHet = 0;

    const itemsWithLiveStats = filteredItems.map(item => {
      const soLuongThuc = item.stocks.reduce((sum, s) => sum + s.soLuong, 0);
      const soLuongMinTotal = item.stocks.reduce((sum, s) => sum + s.soLuongMin, 0);
      
      const price = (item as any)[priceField] || 0;
      tongGiaTri += (soLuongThuc * price);

      if (soLuongThuc <= 0) {
        hetHang++;
      } else if (soLuongMinTotal > 0 && soLuongThuc <= soLuongMinTotal) {
        sapHet++;
      }

      return { ...item, soLuongThuc };
    });

    const tongMatHang = filteredItems.length;

    // Simple grouping by whichever category is present
    const catMap = new Map();
    for (const it of itemsWithLiveStats) {
      const catName = it.erpCategory?.name || it.category?.name || "Khác";
      const value = it.soLuongThuc * ((it as any)[priceField] || 0);
      catMap.set(catName, (catMap.get(catName) || 0) + value);
    }
    
    const categoryStats = Array.from(catMap.entries())
      .map(([label, value]) => ({ label, value: Math.round(value) }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({ 
      tongMatHang, 
      tongGiaTri, 
      hetHang, 
      sapHet, 
      categoryStats 
    });
  } catch (e) {
    console.error("[GET /api/logistics/inventory/stats]", e);
    return NextResponse.json({ 
      tongMatHang: 0, 
      tongGiaTri: 0, 
      hetHang: 0, 
      sapHet: 0, 
      categoryStats: [] 
    }, { status: 500 });
  }
}


async function getCategoryIdsRecursive(categoryId: string): Promise<string[]> {
  const prisma = require('@/lib/prisma').prisma;
  const result = [categoryId];
  const children = await prisma.inventoryCategory.findMany({ where: { parentId: categoryId }, select: { id: true } });
  for (const child of children) {
    const childIds = await getCategoryIdsRecursive(child.id);
    result.push(...childIds);
  }
  return result;
}
