import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/stock-movements/the-kho
 *
 * Trả về lịch sử biến động (thẻ kho) của 1 mặt hàng tại 1 kho (hoặc toàn hệ thống).
 *
 * Query:
 *   itemId:       required
 *   warehouseId?: nếu có thì lọc theo kho
 *   from?:        ISO date start
 *   to?:          ISO date end
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const itemId      = searchParams.get("itemId");
  const warehouseId = searchParams.get("warehouseId");
  const from        = searchParams.get("from");
  const to          = searchParams.get("to");

  if (!itemId) return NextResponse.json({ error: "itemId bắt buộc" }, { status: 400 });

  // Thông tin mặt hàng
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    select: { id: true, code: true, tenHang: true, donVi: true },
  });
  if (!item) return NextResponse.json({ error: "Không tìm thấy mặt hàng" }, { status: 404 });

  // Tồn đầu kỳ = tổng nhập - tổng xuất trước khoảng thời gian (snapshot approach)
  // Đơn giản: lấy tất cả movement và tính running balance
  const movements = await prisma.stockMovement.findMany({
    where: {
      inventoryItemId: itemId,
      ...(warehouseId ? {
        OR: [
          { fromWarehouseId: warehouseId },
          { toWarehouseId:   warehouseId },
        ],
      } : {}),
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to   ? { lte: new Date(to)   } : {}),
        },
      } : {}),
    },
    include: {
      fromWarehouse: { select: { name: true } },
      toWarehouse:   { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Tồn đầu kỳ (tính từ soLuongTruoc của movement đầu tiên nếu có)
  let tonDau = 0;
  if (movements.length > 0) {
    const first = movements[0];
    tonDau = first.soLuongTruoc ?? 0;
  }

  // Xây dựng bảng chạy
  let runningBalance = tonDau;
  const rows = movements.map(mv => {
    const isNhap = mv.toWarehouseId === warehouseId || (!warehouseId && !mv.fromWarehouseId);
    const isXuat = mv.fromWarehouseId === warehouseId || (!warehouseId && !mv.toWarehouseId);
    const soNhap = (isNhap || mv.type === "nhap" || mv.type === "dieu-chinh" && (mv.soLuongSau ?? 0) > (mv.soLuongTruoc ?? 0)) ? mv.soLuong : 0;
    const soXuat = (isXuat || mv.type === "xuat" || mv.type === "dieu-chinh" && (mv.soLuongSau ?? 0) < (mv.soLuongTruoc ?? 0)) ? mv.soLuong : 0;

    // Dùng snapshot nếu có
    if (mv.soLuongSau !== null && mv.soLuongSau !== undefined) {
      runningBalance = mv.soLuongSau;
    } else {
      runningBalance += soNhap - soXuat;
    }

    return {
      id:          mv.id,
      ngay:        mv.createdAt,
      soChungTu:   mv.soChungTu,
      loai:        mv.type,         // nhap | xuat | chuyen | dieu-chinh
      dienGiai:    mv.lyDo ?? loaiLabel(mv.type),
      khoNguon:    mv.fromWarehouse?.name,
      khoDich:     mv.toWarehouse?.name,
      soNhap:      soNhap || undefined,
      soXuat:      soXuat || undefined,
      tonCuoi:     runningBalance,
    };
  });

  // Tồn cuối kỳ
  const tonCuoi = rows.length > 0 ? rows[rows.length - 1].tonCuoi : tonDau;

  return NextResponse.json({
    item: { id: item.id, code: item.code, tenHang: item.tenHang, donVi: item.donVi },
    tonDau,
    tonCuoi,
    rows,
  });
}

function loaiLabel(type: string): string {
  switch (type) {
    case "nhap":       return "Nhập kho";
    case "xuat":       return "Xuất kho";
    case "chuyen":     return "Luân chuyển kho";
    case "dieu-chinh": return "Điều chỉnh kiểm kho";
    default:           return type;
  }
}
