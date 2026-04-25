import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * POST /api/plan-finance/inventory/assign-warehouse
 *
 * Phân hàng hoá vào kho — tạo InventoryStock với soLuong = 0 (nếu chưa có).
 * Body: { inventoryItemId: string; warehouseId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { inventoryItemId, warehouseId } = await req.json();
    if (!inventoryItemId || !warehouseId)
      return NextResponse.json({ error: "Thiếu inventoryItemId hoặc warehouseId" }, { status: 400 });

    // Upsert — nếu đã có thì giữ nguyên soLuong, chỉ tạo mới nếu chưa có
    const stock = await prisma.inventoryStock.upsert({
      where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
      create: { inventoryItemId, warehouseId, soLuong: 0 },
      update: {},  // nếu đã có → không thay đổi gì
      include: {
        warehouse: { select: { name: true } },
      },
    });

    return NextResponse.json({
      ok:           true,
      soLuong:      stock.soLuong,
      soLuongMin:   stock.soLuongMin,
      warehouseId:  stock.warehouseId,
      warehouseName: stock.warehouse.name,
      viTriHang:    stock.viTriHang,
      viTriCot:     stock.viTriCot,
      viTriTang:    stock.viTriTang,
    });
  } catch (e) {
    console.error("[POST /inventory/assign-warehouse]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
