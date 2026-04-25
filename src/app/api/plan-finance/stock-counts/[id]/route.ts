import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/stock-counts/[id]
 * Lấy phiếu kiểm kho kèm toàn bộ lines + tên hàng hoá.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.stockCount.findUnique({
    where:   { id },
    include: {
      warehouse: { select: { name: true } },
      lines:     true,
    },
  });
  if (!doc) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // Lấy thông tin mặt hàng cho các lines
  const itemIds = [...new Set(doc.lines.map(l => l.inventoryItemId))];
  const items   = await prisma.inventoryItem.findMany({
    where:  { id: { in: itemIds } },
    select: { id: true, tenHang: true, code: true, donVi: true },
  });
  const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

  return NextResponse.json({
    id:            doc.id,
    soChungTu:     doc.soChungTu,
    scope:         doc.scope,
    warehouseId:   doc.warehouseId,
    warehouseName: doc.warehouse?.name ?? null,
    nguoiKiem:     doc.nguoiKiem,
    ngayKiem:      doc.ngayKiem,
    ghiChu:        doc.ghiChu,
    trangThai:     doc.trangThai,
    lines: doc.lines.map(l => ({
      id:              l.id,
      inventoryItemId: l.inventoryItemId,
      tenHang:         itemMap[l.inventoryItemId]?.tenHang ?? l.inventoryItemId,
      maSku:           itemMap[l.inventoryItemId]?.code    ?? null,
      donVi:           itemMap[l.inventoryItemId]?.donVi   ?? null,
      warehouseId:     l.warehouseId,
      soLuongHeTong:   l.soLuongHeTong,
      soLuongThucTe:   l.soLuongThucTe,
      chenh:           l.chenh,
      ghiChu:          l.ghiChu,
    })),
  });
}
