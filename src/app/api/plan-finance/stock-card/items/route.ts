import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/stock-card/items?warehouseId=xxx
 * Lấy danh sách mặt hàng có tồn kho tại kho chỉ định.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const warehouseId = req.nextUrl.searchParams.get("warehouseId");
  if (!warehouseId) return NextResponse.json({ error: "Thiếu warehouseId" }, { status: 400 });

  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    select: { type: true }
  });

  if (!warehouse) return NextResponse.json({ error: "Không tìm thấy kho hàng" }, { status: 404 });

  if (warehouse.type === "MATERIAL") {
    const stocks = await prisma.materialStock.findMany({
      where:   { warehouseId },
      include: {
        material: {
          include: {
            category: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { material: { name: "asc" } },
    });

    return NextResponse.json(
      stocks
        .filter(s => s.material)
        .map(s => ({
          id:           s.material.id,
          tenHang:      s.material.name,
          code:         s.material.code,
          loai:         "vat-tu",
          categoryId:   s.material.categoryId,
          categoryName: s.material.category?.name ?? null,
        }))
    );
  } else {
    const stocks = await prisma.inventoryStock.findMany({
      where:   { warehouseId },
      include: {
        inventoryItem: {
          include: {
            category: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { inventoryItem: { tenHang: "asc" } },
    });

    return NextResponse.json(
      stocks
        .filter(s => s.inventoryItem)
        .map(s => ({
          id:           s.inventoryItem!.id,
          tenHang:      s.inventoryItem!.tenHang,
          code:         s.inventoryItem!.code,
          loai:         s.inventoryItem!.loai,
          categoryId:   s.inventoryItem!.categoryId,
          categoryName: s.inventoryItem!.category?.name ?? null,
        }))
    );
  }
}
