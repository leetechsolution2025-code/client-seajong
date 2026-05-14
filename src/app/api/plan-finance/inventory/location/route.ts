import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/inventory/location?itemId=xxx&warehouseId=yyy
 *
 * Trả về vị trí + tồn của item trong kho (từ InventoryStock).
 * Dùng cho LuanChuyenKhoModal để pre-fill vị trí kho đích.
 *
 * Response:
 *   { viTriHang, viTriCot, viTriTang, soLuong } | { exists: false }
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const itemId      = searchParams.get("itemId");
  const warehouseId = searchParams.get("warehouseId");

  if (!itemId || !warehouseId)
    return NextResponse.json({ error: "itemId và warehouseId bắt buộc" }, { status: 400 });

  const stock = await prisma.inventoryStock.findUnique({
    where: { inventoryItemId_warehouseId: { inventoryItemId: itemId, warehouseId } },
    select: { viTriHang: true, viTriCot: true, viTriTang: true, soLuong: true },
  });

  if (!stock) return NextResponse.json({ exists: false, soLuong: 0 });

  return NextResponse.json({
    exists:   true,
    soLuong:  stock.soLuong,
    viTriHang: stock.viTriHang ?? "",
    viTriCot:  stock.viTriCot  ?? "",
    viTriTang: stock.viTriTang ?? "",
  });
}
