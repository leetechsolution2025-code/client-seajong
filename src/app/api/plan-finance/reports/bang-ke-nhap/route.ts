import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/reports/bang-ke-nhap
 * Bảng kê nhập kho: tất cả giao dịch nhập vào kho trong kỳ.
 * Bao gồm: nhap + transfer vào kho này + dieu-chinh tăng
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
        { type: "nhap",         toWarehouseId:   warehouseId },
        { type: "chuyen",       toWarehouseId:   warehouseId },
        { type: "luan-chuyen",  toWarehouseId:   warehouseId },
        { type: "dieu-chinh" ,  toWarehouseId:   warehouseId },
        // điều chỉnh không có toWarehouseId rõ ràng — lấy theo inventoryItem stock ở kho nào
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

  // Thêm dieu-chinh tăng không có toWarehouseId (nhưng item có stock ở kho này)
  const stockItemIds = (await prisma.inventoryStock.findMany({
    where: { warehouseId },
    select: { inventoryItemId: true },
  })).map(s => s.inventoryItemId);

  const adjustments = await prisma.stockMovement.findMany({
    where: {
      type:             "dieu-chinh",
      toWarehouseId:    null,
      fromWarehouseId:  null,
      inventoryItemId:  { in: stockItemIds },
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
      // Với dieu-chinh: lấy diff dương
      if (mv.type === "dieu-chinh") {
        if (mv.soLuongSau !== null && mv.soLuongTruoc !== null) {
          const diff = mv.soLuongSau - mv.soLuongTruoc;
          if (diff <= 0) return null; // bỏ qua điều chỉnh giảm
          soLuong = diff;
        }
      }
      const giaNhap = mv.inventoryItem?.giaNhap ?? 0;
      return {
        soChungTu:      mv.soChungTu,
        ngay:           mv.createdAt,
        type:           mv.type,
        lyDo:           mv.lyDo,
        fromKho:        mv.fromWarehouse?.name ?? null,
        toKho:          mv.toWarehouse?.name   ?? null,
        maSku:          mv.inventoryItem?.code    ?? null,
        tenHang:        mv.inventoryItem?.tenHang ?? "—",
        donVi:          mv.inventoryItem?.donVi   ?? null,
        soLuong,
        donGia:         giaNhap,
        thanhTien:      soLuong * giaNhap,
      };
    })
    .filter(Boolean);

  return NextResponse.json(lines);
}
