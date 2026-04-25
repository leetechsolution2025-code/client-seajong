import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/inventory/stock-snapshot
 *
 * Trả về TOÀN BỘ danh sách InventoryItem để dùng trong phiếu kiểm kho.
 * Những mặt hàng chưa có tồn (tồn = 0 hoặc chưa từng nhập) VẪN xuất hiện.
 *
 * Query:
 *   warehouseId? — nếu có: hiện tồn tại kho đó + vị trí; nếu không: hiện tổng tồn toàn hệ thống
 *
 * Response: [{
 *   inventoryItemId, tenHang, maSku, donVi, giaNhap, categoryId, categoryName, trangThai,
 *   soLuongHeTong, soLuongMin,
 *   warehouseId?, warehouseName?, viTriHang?, viTriCot?, viTriTang?,
 * }]
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const warehouseId = searchParams.get("warehouseId");

  const items = await prisma.inventoryItem.findMany({
    select: {
      id:         true,
      code:       true,
      tenHang:    true,
      donVi:      true,
      giaNhap:    true,
      soLuongMin:        true,
      thongSoKyThuat:    true,
      trangThai:         true,
      categoryId: true,
      category:   { select: { name: true } },
      stocks: warehouseId
        ? {
            where:   { warehouseId },
            select:  { soLuong: true, soLuongMin: true, viTriHang: true, viTriCot: true, viTriTang: true },
          }
        : {
            select:  { soLuong: true, soLuongMin: true },
          },
    },
    orderBy: { tenHang: "asc" },
  });

  if (warehouseId) {
    const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { name: true } });

    // Chỉ giữ item có InventoryStock trong kho này (bỏ qua hàng chưa từng có trong kho)
    return NextResponse.json(items.filter(it => it.stocks.length > 0).map(it => {
      type StockLocated = { soLuong: number; soLuongMin: number; viTriHang: string | null; viTriCot: string | null; viTriTang: string | null };
      const stock = (it.stocks as StockLocated[])[0] ?? null;
      return {
        inventoryItemId: it.id,
        tenHang:         it.tenHang,
        maSku:           it.code,
        donVi:           it.donVi,
        giaNhap:         it.giaNhap,
        trangThai:       it.trangThai,
        categoryId:      it.categoryId,
        categoryName:    it.category?.name ?? null,
        thongSoKyThuat:  it.thongSoKyThuat ?? null,
        soLuongHeTong:   stock?.soLuong    ?? 0,
        soLuongMin:      Math.max(stock?.soLuongMin ?? 0, it.soLuongMin),
        warehouseId,
        warehouseName:   wh?.name ?? "",
        viTriHang:       stock?.viTriHang  ?? null,
        viTriCot:        stock?.viTriCot   ?? null,
        viTriTang:       stock?.viTriTang  ?? null,
      };
    }));
  } else {
    return NextResponse.json(items.map(it => {
      type StockBasic = { soLuong: number; soLuongMin: number };
      const allStocks     = it.stocks as StockBasic[];
      const soLuongHeTong = allStocks.reduce((s, st) => s + st.soLuong, 0);
      const soLuongMinKho = allStocks.length > 0 ? Math.max(...allStocks.map(st => st.soLuongMin)) : 0;
      return {
        inventoryItemId: it.id,
        tenHang:         it.tenHang,
        maSku:           it.code,
        donVi:           it.donVi,
        giaNhap:         it.giaNhap,
        trangThai:       it.trangThai,
        categoryId:      it.categoryId,
        categoryName:    it.category?.name ?? null,
        thongSoKyThuat:  it.thongSoKyThuat ?? null,
        soLuongHeTong,
        soLuongMin:      Math.max(soLuongMinKho, it.soLuongMin),
        chuaPhanKho:     allStocks.length === 0,  // true nếu chưa từng phân vào kho nào
      };
    }));
  }
}
