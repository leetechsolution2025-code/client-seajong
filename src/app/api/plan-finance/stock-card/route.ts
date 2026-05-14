import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/stock-card?inventoryItemId=xxx&warehouseId=yyy&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Thẻ kho: lịch sử nhập/xuất/điều chỉnh của 1 mặt hàng tại 1 kho.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const inventoryItemId  = searchParams.get("inventoryItemId");
  const warehouseId      = searchParams.get("warehouseId");
  const from             = searchParams.get("from");
  const to               = searchParams.get("to");

  if (!inventoryItemId) {
    return NextResponse.json({ error: "Thiếu inventoryItemId" }, { status: 400 });
  }

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { inventoryItemId };
  if (warehouseId) {
    where.OR = [
      { fromWarehouseId: warehouseId },
      { toWarehouseId:   warehouseId },
    ];
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to)   where.createdAt.lte = new Date(to + "T23:59:59");
  }

  const [item, movements] = await Promise.all([
    prisma.inventoryItem.findUnique({
      where:  { id: inventoryItemId },
      select: {
        id: true, tenHang: true, code: true, donVi: true,
        giaNhap: true, soLuongMin: true,
        category: { select: { name: true } },
        stocks: warehouseId
          ? { where: { warehouseId }, select: { soLuong: true } }
          : { select: { soLuong: true } },
      },
    }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        fromWarehouse: { select: { name: true } },
        toWarehouse:   { select: { name: true } },
      },
    }),
  ]);

  if (!item) return NextResponse.json({ error: "Không tìm thấy mặt hàng" }, { status: 404 });

  // Tồn đầu kỳ = soLuongTruoc của movement đầu tiên trong kỳ
  // (số lượng tồn TRƯỚC giao dịch đầu tiên — đây mới là "Số dư đầu kỳ")
  let balance = movements.length > 0 ? (movements[0].soLuongTruoc ?? 0) : 0;
  const tonDauKy = balance;

  const lines = movements.map(mv => {
    let effectiveIn  = 0;
    let effectiveOut = 0;

    if (mv.type === "nhap") {
      effectiveIn = mv.soLuong;
      balance += effectiveIn;

    } else if (mv.type === "xuat") {
      effectiveOut = mv.soLuong;
      balance -= effectiveOut;

    } else if (mv.type === "luan-chuyen" || mv.type === "chuyen") {
      if (mv.toWarehouseId === warehouseId)   { effectiveIn  = mv.soLuong; balance += effectiveIn; }
      if (mv.fromWarehouseId === warehouseId) { effectiveOut = mv.soLuong; balance -= effectiveOut; }

    } else if (mv.type === "dieu-chinh") {
      // Điều chỉnh: reset balance về soLuongSau (số thực kiểm kê)
      if (mv.soLuongSau !== null && mv.soLuongTruoc !== null) {
        const diff = mv.soLuongSau - mv.soLuongTruoc;
        if (diff > 0) effectiveIn  =  diff;
        else          effectiveOut = -diff;
        balance = mv.soLuongSau;          // reset chính xác về số thực
      } else {
        effectiveIn = mv.soLuong;
        balance += effectiveIn;
      }
    }

    return {
      id:            mv.id,
      ngay:          mv.createdAt,
      type:          mv.type,
      soChungTu:     mv.soChungTu,
      lyDo:          mv.lyDo,
      nguoiThucHien: mv.nguoiThucHien,
      fromKho:       mv.fromWarehouse?.name ?? null,
      toKho:         mv.toWarehouse?.name   ?? null,
      nhap:          effectiveIn  > 0 ? effectiveIn  : null,
      xuat:          effectiveOut > 0 ? effectiveOut : null,
      tonCuoi:       balance,
      chenh:         mv.soLuongSau !== null ? mv.soLuongSau - (mv.soLuongTruoc ?? 0) : null,
    };
  });

  const tonHienTai = warehouseId
    ? (item.stocks[0]?.soLuong ?? 0)
    : item.stocks.reduce((s, st) => s + st.soLuong, 0);

  return NextResponse.json({
    item: {
      id:         item.id,
      tenHang:    item.tenHang,
      code:       item.code,
      donVi:      item.donVi,
      giaNhap:    item.giaNhap,
      soLuongMin: item.soLuongMin,
      category:   item.category?.name ?? null,
    },
    tonDauKy,
    tonHienTai,
    lines,
  });
}
