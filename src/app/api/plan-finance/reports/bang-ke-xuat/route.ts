import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/reports/bang-ke-xuat
 * Bảng kê xuất kho: tất cả giao dịch xuất ra khỏi kho trong kỳ.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");
  const from        = searchParams.get("from");
  const to          = searchParams.get("to");

  if (!warehouseId) return NextResponse.json({ error: "Thiếu warehouseId" }, { status: 400 });

  const movements = await prisma.stockMovement.findMany({
    where: {
      OR: [
        { type: "xuat",        fromWarehouseId: warehouseId },
        { type: "chuyen",      fromWarehouseId: warehouseId },
        { type: "luan-chuyen", fromWarehouseId: warehouseId },
        { type: "dieu-chinh",  fromWarehouseId: warehouseId },
      ],
      createdAt: {
        ...(from ? { gte: new Date(from) }                  : {}),
        ...(to   ? { lte: new Date(to + "T23:59:59") }      : {}),
      },
    },
    include: {
      inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true } },
      fromWarehouse: { select: { name: true } },
      toWarehouse:   { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Điều chỉnh giảm không có fromWarehouseId
  const stockItemIds = (await prisma.inventoryStock.findMany({
    where: { warehouseId },
    select: { inventoryItemId: true },
  })).map(s => s.inventoryItemId);

  const adjustments = await prisma.stockMovement.findMany({
    where: {
      type:            "dieu-chinh",
      fromWarehouseId: null,
      toWarehouseId:   null,
      inventoryItemId: { in: stockItemIds },
      createdAt: {
        ...(from ? { gte: new Date(from) }             : {}),
        ...(to   ? { lte: new Date(to + "T23:59:59") } : {}),
      },
    },
    include: {
      inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true } },
      fromWarehouse: { select: { name: true } },
      toWarehouse:   { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const all = [...movements, ...adjustments];

  const lines = all
    .map(mv => {
      let soLuong = mv.soLuong;
      if (mv.type === "dieu-chinh") {
        if (mv.soLuongSau !== null && mv.soLuongTruoc !== null) {
          const diff = mv.soLuongTruoc - mv.soLuongSau; // giảm = xuất
          if (diff <= 0) return null;
          soLuong = diff;
        }
      }
      const giaBan = mv.inventoryItem?.giaNhap ?? 0; // dùng giaNhap làm giá xuất tạm
      return {
        soChungTu:  mv.soChungTu,
        ngay:       mv.createdAt,
        type:       mv.type,
        lyDo:       mv.lyDo,
        fromKho:    mv.fromWarehouse?.name ?? null,
        toKho:      mv.toWarehouse?.name   ?? null,
        maSku:      mv.inventoryItem?.code    ?? null,
        tenHang:    mv.inventoryItem?.tenHang ?? "—",
        donVi:      mv.inventoryItem?.donVi   ?? null,
        soLuong,
        donGia:     giaBan,
        thanhTien:  soLuong * giaBan,
      };
    })
    .filter(Boolean);

  return NextResponse.json(lines);
}
