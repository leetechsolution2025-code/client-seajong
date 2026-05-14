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

  // Lấy các mặt hàng đang có tồn kho (>= 0) tại kho này
  const stocks = await prisma.inventoryStock.findMany({
    where:   { warehouseId },
    include: { inventoryItem: { select: { id: true, tenHang: true, code: true } } },
    orderBy: { inventoryItem: { tenHang: "asc" } },
  });

  return NextResponse.json(
    stocks
      .filter(s => s.inventoryItem)
      .map(s => ({
        id:      s.inventoryItem!.id,
        tenHang: s.inventoryItem!.tenHang,
        code:    s.inventoryItem!.code,
      }))
  );
}
