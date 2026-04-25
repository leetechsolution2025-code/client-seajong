import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * POST /api/plan-finance/stock-movements/batch-luan-chuyen
 *
 * Luân chuyển hàng hoá giữa 2 kho nội bộ.
 * - Kiểm tra tồn kho nguồn trước
 * - Tạo 1 StockMovement (type = "chuyen") mỗi line với fromWarehouseId + toWarehouseId
 * - Trừ InventoryStock kho nguồn
 * - Cộng InventoryStock kho đích (upsert; merge vị trí nếu người dùng nhập)
 * - Cập nhật tổng tồn trên InventoryItem
 *
 * Body:
 * {
 *   fromWarehouseId: string
 *   toWarehouseId:   string
 *   soChungTu?:      string
 *   lyDo?:           string
 *   nguoiThucHien?:  string
 *   lines: [{
 *     inventoryItemId:  string
 *     soLuong:          number   // SL thực chuyển
 *     soLuongYC?:       number   // SL yêu cầu
 *     donGia?:          number
 *     viTriHangXuat?:   string   // Vị trí lấy hàng ở kho nguồn
 *     viTriCotXuat?:    string
 *     viTriTangXuat?:   string
 *     viTriHangNhap?:   string   // Vị trí đặt hàng ở kho đích
 *     viTriCotNhap?:    string
 *     viTriTangNhap?:   string
 *     ghiChu?:          string
 *   }]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      fromWarehouseId,
      toWarehouseId,
      soChungTu,
      lyDo,
      nguoiThucHien,
      lines = [],
    }: {
      fromWarehouseId:  string;
      toWarehouseId:    string;
      soChungTu?:       string;
      lyDo?:            string;
      nguoiThucHien?:   string;
      lines: {
        inventoryItemId:  string;
        soLuong:          number;
        soLuongYC?:       number;
        donGia?:          number;
        viTriHangXuat?:   string;
        viTriCotXuat?:    string;
        viTriTangXuat?:   string;
        viTriHangNhap?:   string;
        viTriCotNhap?:    string;
        viTriTangNhap?:   string;
        ghiChu?:          string;
      }[];
    } = body;

    if (!fromWarehouseId)               return NextResponse.json({ error: "fromWarehouseId bắt buộc" }, { status: 400 });
    if (!toWarehouseId)                 return NextResponse.json({ error: "toWarehouseId bắt buộc" }, { status: 400 });
    if (fromWarehouseId === toWarehouseId) return NextResponse.json({ error: "Kho nguồn và kho đích phải khác nhau" }, { status: 400 });
    if (!lines.length)                  return NextResponse.json({ error: "Cần ít nhất 1 dòng hàng hoá" }, { status: 400 });

    // ── Bước 1: Kiểm tra tồn kho nguồn ──────────────────────────────────────
    const insufficient: { inventoryItemId: string; tenHang: string; soLuong: number; soLuongTon: number }[] = [];

    for (const line of lines) {
      if (!line.inventoryItemId || !line.soLuong || line.soLuong <= 0) continue;
      const stock = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId: line.inventoryItemId, warehouseId: fromWarehouseId } },
        include: { inventoryItem: { select: { tenHang: true } } },
      });
      const soLuongTon = stock?.soLuong ?? 0;
      if (line.soLuong > soLuongTon) {
        insufficient.push({
          inventoryItemId: line.inventoryItemId,
          tenHang:         stock?.inventoryItem.tenHang ?? line.inventoryItemId,
          soLuong:         line.soLuong,
          soLuongTon,
        });
      }
    }

    if (insufficient.length > 0) {
      return NextResponse.json(
        { error: "Một số mặt hàng không đủ tồn kho để chuyển", insufficient },
        { status: 400 }
      );
    }

    // ── Bước 2: Thực hiện chuyển kho ─────────────────────────────────────────
    const movements = [];

    for (const line of lines) {
      const {
        inventoryItemId, soLuong, soLuongYC, donGia,
        viTriHangXuat, viTriCotXuat, viTriTangXuat,
        viTriHangNhap, viTriCotNhap, viTriTangNhap,
        ghiChu,
      } = line;

      if (!inventoryItemId || !soLuong || soLuong <= 0) continue;

      // Tồn kho nguồn hiện tại
      const srcStock = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: fromWarehouseId } },
      });
      const soLuongTruoc = srcStock?.soLuong ?? 0;
      const soLuongSau   = soLuongTruoc - soLuong;

      // ── Trừ tồn kho nguồn ──
      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: fromWarehouseId } },
        create: { inventoryItemId, warehouseId: fromWarehouseId, soLuong: Math.max(0, soLuongSau) },
        update: {
          soLuong: Math.max(0, soLuongSau),
          // Cập nhật vị trí ở kho nguồn nếu người dùng điều chỉnh
          ...(viTriHangXuat !== undefined && { viTriHang: viTriHangXuat }),
          ...(viTriCotXuat  !== undefined && { viTriCot:  viTriCotXuat  }),
          ...(viTriTangXuat !== undefined && { viTriTang: viTriTangXuat }),
        },
      });

      // Tồn kho đích hiện tại
      const dstStock = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: toWarehouseId } },
      });
      const dstSoLuongTruoc = dstStock?.soLuong ?? 0;
      const dstSoLuongSau   = dstSoLuongTruoc + soLuong;

      // ── Cộng tồn kho đích + lưu vị trí đích ──
      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: toWarehouseId } },
        create: {
          inventoryItemId, warehouseId: toWarehouseId, soLuong: dstSoLuongSau,
          viTriHang: viTriHangNhap || null,
          viTriCot:  viTriCotNhap  || null,
          viTriTang: viTriTangNhap || null,
        },
        update: {
          soLuong: dstSoLuongSau,
          // Chỉ cập nhật vị trí đích nếu người dùng nhập (không ghi đè với empty)
          ...(viTriHangNhap ? { viTriHang: viTriHangNhap } : {}),
          ...(viTriCotNhap  ? { viTriCot:  viTriCotNhap  } : {}),
          ...(viTriTangNhap ? { viTriTang: viTriTangNhap } : {}),
        },
      });

      // ── Ghi StockMovement (type = chuyen, có cả from + to) ──
      const mv = await prisma.stockMovement.create({
        data: {
          inventoryItemId,
          type:            "chuyen",
          fromWarehouseId,
          toWarehouseId,
          soLuong,
          soLuongCT:       soLuongYC     || undefined,
          soLuongTruoc,
          soLuongSau:      Math.max(0, soLuongSau),
          donGia:          donGia        || undefined,
          lyDo:            lyDo          || ghiChu || undefined,
          soChungTu:       soChungTu     || undefined,
          nguoiThucHien:   nguoiThucHien || undefined,
        },
      });

      movements.push(mv);

      // ── Cập nhật tổng tồn trên InventoryItem ──
      const allStocks   = await prisma.inventoryStock.findMany({
        where: { inventoryItemId },
        include: { inventoryItem: { select: { soLuongMin: true } } },
      });
      const tongSoLuong = allStocks.reduce((s, st) => s + st.soLuong, 0);
      const soLuongMin  = allStocks[0]?.inventoryItem.soLuongMin ?? 0;
      const trangThai   = tongSoLuong === 0     ? "het-hang"
                        : soLuongMin > 0 && tongSoLuong <= soLuongMin ? "sap-het"
                        : "con-hang";

      await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data:  { soLuong: tongSoLuong, trangThai },
      });
    }

    return NextResponse.json({ ok: true, count: movements.length, movements });
  } catch (e) {
    console.error("[POST /stock-movements/batch-luan-chuyen]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
