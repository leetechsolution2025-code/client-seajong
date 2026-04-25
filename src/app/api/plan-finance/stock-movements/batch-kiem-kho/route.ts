import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * POST /api/plan-finance/stock-movements/batch-kiem-kho
 *
 * Lưu kết quả kiểm kho + điều chỉnh tồn kho.
 * Chỉ tạo StockMovement cho dòng có chênh lệch (soLuongThucTe ≠ soLuongHeTong).
 *
 * Body:
 * {
 *   warehouseId?: string        // null → toàn hệ thống (điều chỉnh từng kho)
 *   soChungTu:    string
 *   nguoiKiem:    string
 *   ngayKiem:     string        // ISO date
 *   ghiChu?:      string
 *   lines: [{
 *     inventoryItemId: string
 *     warehouseId?:    string   // bắt buộc nếu kiểm theo kho cụ thể
 *     soLuongThucTe:   number   // số đếm thực tế
 *     soLuongHeTong:   number   // tồn hệ thống tại thời điểm kiểm
 *     ghiChu?:         string
 *   }]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      warehouseId: headerWarehouseId,
      soChungTu,
      nguoiKiem,
      ngayKiem,
      ghiChu,
      lines = [],
    }: {
      warehouseId?: string;
      soChungTu:    string;
      nguoiKiem?:   string;
      ngayKiem?:    string;
      ghiChu?:      string;
      lines: {
        inventoryItemId: string;
        warehouseId?:    string;
        soLuongThucTe:   number;
        soLuongHeTong:   number;
        ghiChu?:         string;
      }[];
    } = body;

    if (!lines.length) return NextResponse.json({ error: "Cần ít nhất 1 dòng kiểm kho" }, { status: 400 });

    const adjustments = [];

    for (const line of lines) {
      const { inventoryItemId, soLuongThucTe, soLuongHeTong, ghiChu: lineGhiChu } = line;
      const wId = line.warehouseId ?? headerWarehouseId;

      if (!wId) continue; // bỏ qua nếu không xác định được kho

      const chenh = soLuongThucTe - soLuongHeTong;
      if (chenh === 0) continue; // khớp → bỏ qua

      // Cập nhật InventoryStock
      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: wId } },
        create: { inventoryItemId, warehouseId: wId, soLuong: Math.max(0, soLuongThucTe) },
        update: { soLuong: Math.max(0, soLuongThucTe) },
      });

      // Ghi StockMovement — type "dieu-chinh"
      const mv = await prisma.stockMovement.create({
        data: {
          inventoryItemId,
          type:           "dieu-chinh",
          fromWarehouseId: chenh < 0 ? wId : null,  // xuất nếu thiếu
          toWarehouseId:   chenh > 0 ? wId : null,  // nhập nếu thừa
          soLuong:         Math.abs(chenh),
          soLuongTruoc:    soLuongHeTong,
          soLuongSau:      soLuongThucTe,
          lyDo:            lineGhiChu ?? ghiChu ?? "Điều chỉnh sau kiểm kho",
          soChungTu:       soChungTu   || undefined,
          nguoiThucHien:   nguoiKiem   || undefined,
          createdAt:       ngayKiem ? new Date(ngayKiem) : undefined,
        },
      });
      adjustments.push(mv);

      // Cập nhật tổng tồn InventoryItem
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

    return NextResponse.json({ ok: true, adjustedCount: adjustments.length, movements: adjustments });
  } catch (e) {
    console.error("[POST /stock-movements/batch-kiem-kho]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
