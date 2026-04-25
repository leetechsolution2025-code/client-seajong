import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * POST /api/plan-finance/stock-movements/batch
 *
 * Nhập kho nhiều mặt hàng cùng lúc.
 *
 * Body:
 * {
 *   type:            "nhap"
 *   toWarehouseId:   string          // kho nhận
 *   soChungTu?:      string          // mã phiếu
 *   lyDo?:           string          // lý do / ghi chú chung
 *   nguoiThucHien?:  string
 *   purchaseOrderId?: string         // PO liên kết (nếu có)
 *   lines: [
 *     {
 *       inventoryItemId: string
 *       soLuong:         number      (> 0)
 *       donGia?:         number
 *       viTriHang?:      string      // vị trí kho: Hàng
 *       viTriCot?:       string      //             Cột
 *       viTriTang?:      string      //             Tầng
 *       ghiChu?:         string
 *     }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      toWarehouseId,
      soChungTu,
      lyDo,
      nguoiThucHien,
      purchaseOrderId,
      lines = [],
    }: {
      toWarehouseId:   string;
      soChungTu?:      string;
      lyDo?:           string;
      nguoiThucHien?:  string;
      purchaseOrderId?: string;
      lines: {
        inventoryItemId: string;
        soLuong:         number;   // SL thực tế nhập
        soLuongCT?:      number;   // SL theo chứng từ (optional)
        donGia?:         number;
        viTriHang?:      string;
        viTriCot?:       string;
        viTriTang?:      string;
        ghiChu?:         string;
      }[];
    } = body;

    if (!toWarehouseId)    return NextResponse.json({ error: "toWarehouseId bắt buộc" }, { status: 400 });
    if (!lines.length)     return NextResponse.json({ error: "Cần ít nhất 1 dòng hàng hoá" }, { status: 400 });

    const movements = [];

    for (const line of lines) {
      const { inventoryItemId, soLuong, soLuongCT, donGia, viTriHang, viTriCot, viTriTang, ghiChu } = line;

      if (!inventoryItemId) continue;
      if (!soLuong || soLuong <= 0) continue;

      // Lấy tồn hiện tại
      const existing = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: toWarehouseId } },
      });

      const soLuongTruoc = existing?.soLuong ?? 0;
      const soLuongSau   = soLuongTruoc + soLuong;

      // Upsert InventoryStock (cập nhật số lượng + vị trí nếu có)
      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: toWarehouseId } },
        create: {
          inventoryItemId,
          warehouseId: toWarehouseId,
          soLuong: soLuongSau,
          ...(viTriHang && { viTriHang }),
          ...(viTriCot  && { viTriCot }),
          ...(viTriTang && { viTriTang }),
          ...(ghiChu    && { ghiChu }),
        },
        update: {
          soLuong: soLuongSau,
          ...(viTriHang !== undefined && { viTriHang: viTriHang || null }),
          ...(viTriCot  !== undefined && { viTriCot:  viTriCot  || null }),
          ...(viTriTang !== undefined && { viTriTang: viTriTang || null }),
          ...(ghiChu    !== undefined && { ghiChu:    ghiChu    || null }),
        },
      });

      // Ghi StockMovement
      const mv = await prisma.stockMovement.create({
        data: {
          inventoryItemId,
          type: "nhap",
          toWarehouseId,
          soLuong,
          soLuongCT:     soLuongCT     || undefined,
          soLuongTruoc,
          soLuongSau,
          donGia:          donGia          || undefined,
          lyDo:            lyDo            || ghiChu || undefined,
          soChungTu:       soChungTu       || undefined,
          nguoiThucHien:   nguoiThucHien   || undefined,
          purchaseOrderId: purchaseOrderId || undefined,
        },
      });

      movements.push(mv);

      // Cập nhật trangThai + soLuong tổng trên InventoryItem
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
    console.error("[POST /stock-movements/batch]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
