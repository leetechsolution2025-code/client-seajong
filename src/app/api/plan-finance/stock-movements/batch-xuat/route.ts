import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * POST /api/plan-finance/stock-movements/batch-xuat
 *
 * Xuất kho nhiều mặt hàng cùng lúc.
 * Kiểm tra tồn kho trước – trả lỗi nếu SL xuất > tồn.
 *
 * Body:
 * {
 *   fromWarehouseId: string
 *   soChungTu?:      string
 *   lyDo?:           string
 *   nguoiThucHien?:  string
 *   salesOrderId?:   string   // đơn bán hàng liên kết (nếu có)
 *   workOrderId?:    string   // lệnh sản xuất liên kết (nếu có)
 *   lines: [
 *     {
 *       inventoryItemId: string
 *       soLuong:         number   // SL thực xuất (> 0)
 *       soLuongYC?:      number   // SL yêu cầu theo lệnh / đơn
 *       donGia?:         number   // giá vốn (nếu biết)
 *       viTriHang?:      string
 *       viTriCot?:       string
 *       viTriTang?:      string
 *       ghiChu?:         string
 *     }
 *   ]
 * }
 *
 * Trả về:
 *   200 { ok, count, movements }
 *   400 { error, insufficient?: [{ inventoryItemId, tenHang, soLuong, soLuongTon }] }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      fromWarehouseId,
      soChungTu,
      lyDo,
      nguoiThucHien,
      salesOrderId,
      workOrderId,
      lines = [],
    }: {
      fromWarehouseId: string;
      soChungTu?:      string;
      lyDo?:           string;
      nguoiThucHien?:  string;
      salesOrderId?:   string;
      workOrderId?:    string;
      lines: {
        inventoryItemId: string;
        soLuong:         number;
        soLuongYC?:      number;
        donGia?:         number;
        viTriHang?:      string;
        viTriCot?:       string;
        viTriTang?:      string;
        ghiChu?:         string;
      }[];
    } = body;

    if (!fromWarehouseId) return NextResponse.json({ error: "fromWarehouseId bắt buộc" }, { status: 400 });
    if (!lines.length)    return NextResponse.json({ error: "Cần ít nhất 1 dòng hàng hoá" }, { status: 400 });

    // ── Bước 1: Kiểm tra tồn kho trước khi ghi ──────────────────────────────
    const insufficient: { inventoryItemId: string; tenHang: string; soLuong: number; soLuongTon: number }[] = [];

    for (const line of lines) {
      if (!line.inventoryItemId || !line.soLuong || line.soLuong <= 0) continue;

      // Lấy InventoryStock theo kho cụ thể
      const stock = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId: line.inventoryItemId, warehouseId: fromWarehouseId } },
        include: { inventoryItem: { select: { tenHang: true, soLuong: true } } },
      });

      let soLuongTon: number;
      let tenHang: string;

      if (stock) {
        // Đã có InventoryStock cho kho này → dùng số chính xác
        soLuongTon = stock.soLuong;
        tenHang    = stock.inventoryItem.tenHang;
      } else {
        // Chưa có InventoryStock (dữ liệu legacy) → fallback về InventoryItem.soLuong
        const legacyItem = await prisma.inventoryItem.findUnique({
          where:  { id: line.inventoryItemId },
          select: { tenHang: true, soLuong: true },
        });
        soLuongTon = legacyItem?.soLuong ?? 0;
        tenHang    = legacyItem?.tenHang ?? line.inventoryItemId;
      }

      if (line.soLuong > soLuongTon) {
        insufficient.push({
          inventoryItemId: line.inventoryItemId,
          tenHang,
          soLuong:    line.soLuong,
          soLuongTon,
        });
      }

    }

    if (insufficient.length > 0) {
      return NextResponse.json(
        { error: "Một số mặt hàng không đủ tồn kho để xuất", insufficient },
        { status: 400 }
      );
    }

    // ── Bước 2: Ghi từng dòng ────────────────────────────────────────────────
    const movements = [];

    for (const line of lines) {
      const { inventoryItemId, soLuong, soLuongYC, donGia, viTriHang, viTriCot, viTriTang, ghiChu } = line;

      if (!inventoryItemId || !soLuong || soLuong <= 0) continue;

      // Lấy tồn hiện tại theo kho; nếu chưa có InventoryStock → dùng soLuong legacy của InventoryItem
      const existing = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: fromWarehouseId } },
      });

      let soLuongTruoc: number;
      if (existing) {
        soLuongTruoc = existing.soLuong;
      } else {
        // Dữ liệu legacy: lấy từ InventoryItem.soLuong
        const legacyItem = await prisma.inventoryItem.findUnique({
          where:  { id: inventoryItemId },
          select: { soLuong: true },
        });
        soLuongTruoc = legacyItem?.soLuong ?? 0;
      }
      const soLuongSau   = soLuongTruoc - soLuong;

      // Cập nhật InventoryStock
      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: fromWarehouseId } },
        create: { inventoryItemId, warehouseId: fromWarehouseId, soLuong: Math.max(0, soLuongSau) },
        update: { soLuong: Math.max(0, soLuongSau) },
      });

      // Ghi StockMovement
      const mv = await prisma.stockMovement.create({
        data: {
          inventoryItemId,
          type:           "xuat",
          fromWarehouseId,
          soLuong,
          soLuongCT:      soLuongYC      || undefined,
          soLuongTruoc,
          soLuongSau:     Math.max(0, soLuongSau),
          donGia:         donGia         || undefined,
          lyDo:           lyDo           || ghiChu || undefined,
          soChungTu:      soChungTu      || undefined,
          nguoiThucHien:  nguoiThucHien  || undefined,
          // salesOrderId / workOrderId nếu schema có — bỏ qua nếu chưa có
        },
      });

      movements.push(mv);

      // Cập nhật trạng thái tổng trên InventoryItem
      const allStocks = await prisma.inventoryStock.findMany({
        where: { inventoryItemId },
        include: { inventoryItem: { select: { soLuongMin: true } } },
      });
      const tongSoLuong = allStocks.reduce((s, st) => s + st.soLuong, 0);
      const soLuongMin  = allStocks[0]?.inventoryItem.soLuongMin ?? 0;
      const trangThai   = tongSoLuong === 0 ? "het-hang"
                        : soLuongMin > 0 && tongSoLuong <= soLuongMin ? "sap-het"
                        : "con-hang";

      await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data:  { soLuong: tongSoLuong, trangThai },
      });
    }

    return NextResponse.json({ ok: true, count: movements.length, movements });
  } catch (e) {
    console.error("[POST /stock-movements/batch-xuat]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
