import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/reports/bang-ke-xnt
 * Bảng kê Xuất - Nhập - Tồn hàng hoá tại một kho trong kỳ.
 * Query: warehouseId, from (YYYY-MM-DD), to (YYYY-MM-DD)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");
  const from        = searchParams.get("from");
  const to          = searchParams.get("to");

  if (!warehouseId) return NextResponse.json({ error: "Thiếu warehouseId" }, { status: 400 });

  const fromDate = from ? new Date(from)                        : new Date("2000-01-01");
  const toDate   = to   ? new Date(to + "T23:59:59")           : new Date();
  const afterTo  = new Date(toDate.getTime() + 1);              // dùng để tính tồn cuối kỳ

  // 1. Tồn kho hiện tại (nguồn sự thật)
  const stocks = await prisma.inventoryStock.findMany({
    where: { warehouseId },
    include: {
      inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true } },
    },
  });

  // 2. Movements trong kỳ
  const inPeriod = await prisma.stockMovement.findMany({
    where: {
      OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
      createdAt: { gte: fromDate, lte: toDate },
    },
    include: {
      inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // 3. Movements SAU kỳ (để tính ngược tonCuoiKy từ stock hiện tại)
  const afterPeriod = await prisma.stockMovement.findMany({
    where: {
      OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
      createdAt: { gte: afterTo },
    },
    include: {
      inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Helper: tính effectiveIn / effectiveOut cho 1 movement tại kho này
  function calcEffect(mv: { type: string; soLuong: number; toWarehouseId: string | null; fromWarehouseId: string | null; soLuongSau: number | null; soLuongTruoc: number | null }) {
    let eIn = 0, eOut = 0;
    if (mv.type === "nhap") { eIn = mv.soLuong; }
    else if (mv.type === "xuat") { eOut = mv.soLuong; }
    else if (mv.type === "luan-chuyen" || mv.type === "chuyen") {
      if (mv.toWarehouseId   === warehouseId) eIn  = mv.soLuong;
      if (mv.fromWarehouseId === warehouseId) eOut = mv.soLuong;
    } else if (mv.type === "dieu-chinh") {
      if (mv.soLuongSau !== null && mv.soLuongTruoc !== null) {
        const d = mv.soLuongSau - mv.soLuongTruoc;
        if (d > 0) eIn = d; else eOut = -d;
      }
    }
    return { eIn, eOut };
  }

  // 4. Nhóm theo item
  const itemStockMap = new Map(stocks.map(s => [s.inventoryItemId, { item: s.inventoryItem, currentSL: s.soLuong }]));

  // Thêm items có movements nhưng không có stock (đã xuất hết)
  for (const mv of [...inPeriod, ...afterPeriod]) {
    if (!itemStockMap.has(mv.inventoryItemId) && mv.inventoryItem) {
      itemStockMap.set(mv.inventoryItemId, { item: mv.inventoryItem as typeof stocks[0]["inventoryItem"], currentSL: 0 });
    }
  }

  // 5. Tính cho từng item
  const results = [];
  for (const [itemId, { item, currentSL }] of itemStockMap) {
    // Tính nhap/xuat trong kỳ
    let nhapSL = 0, xuatSL = 0;
    for (const mv of inPeriod.filter(m => m.inventoryItemId === itemId)) {
      const { eIn, eOut } = calcEffect(mv);
      nhapSL += eIn; xuatSL += eOut;
    }

    // Tính nhap/xuat sau kỳ → để suy ngược tonCuoiKy
    let afterNhap = 0, afterXuat = 0;
    for (const mv of afterPeriod.filter(m => m.inventoryItemId === itemId)) {
      const { eIn, eOut } = calcEffect(mv);
      afterNhap += eIn; afterXuat += eOut;
    }

    // tonCuoiKy tại ngày "to" = currentSL - afterNhap + afterXuat
    const tonCuoiSL = Math.max(0, currentSL - afterNhap + afterXuat);
    // tonDauKy = tonCuoiKy - nhap + xuat
    const tonDauSL  = Math.max(0, tonCuoiSL - nhapSL + xuatSL);

    // Bỏ qua dòng hoàn toàn rỗng
    if (tonDauSL === 0 && nhapSL === 0 && xuatSL === 0 && tonCuoiSL === 0) continue;

    const giaNhap = item.giaNhap ?? 0;
    results.push({
      maSku:      item.code,
      tenHang:    item.tenHang,
      donVi:      item.donVi,
      tonDauSL,
      tonDauTT:   tonDauSL  * giaNhap,
      nhapSL,
      nhapTT:     nhapSL    * giaNhap,
      xuatSL,
      xuatTT:     xuatSL    * giaNhap,
      tonCuoiSL,
      tonCuoiTT:  tonCuoiSL * giaNhap,
    });
  }

  // Sắp xếp theo tên
  results.sort((a, b) => a.tenHang.localeCompare(b.tenHang, "vi"));
  return NextResponse.json(results);
}
