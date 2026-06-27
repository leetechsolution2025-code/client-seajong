import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/reports/bao-cao-ban-hang
 * Báo cáo bán hàng: tổng hợp hàng hoá xuất bán trong kỳ (xác định qua stock movements xuất kho).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const from        = searchParams.get("from");
    const to          = searchParams.get("to");

    // Lọc movements type = xuat
    const movements = await prisma.stockMovement.findMany({
      where: {
        type: "xuat",
        ...(warehouseId && warehouseId !== "all" ? { fromWarehouseId: warehouseId } : {}),
        createdAt: {
          ...(from ? { gte: new Date(from) }             : {}),
          ...(to   ? { lte: new Date(to + "T23:59:59") } : {}),
        },
      },
      include: {
        inventoryItem: {
          select: {
            id: true,
            code: true,
            tenHang: true,
            donVi: true,
            giaNhap: true,
          }
        }
      },
      orderBy: { createdAt: "asc" },
    });

    // Gom nhóm theo inventoryItemId
    const map = new Map<string, {
      id: string;
      maSku: string | null;
      tenHang: string;
      donVi: string | null;
      soLuong: number;
      donGia: number;
      thanhTien: number;
    }>();

    for (const mv of movements) {
      const item = mv.inventoryItem;
      if (!item) continue;
      
      const id = item.id;
      const qty = mv.soLuong ?? 0;
      // Dùng donGia của movement, nếu null dùng giaNhap của item làm dự phòng
      const price = mv.donGia ?? item.giaNhap ?? 0;
      const val = qty * price;

      if (map.has(id)) {
        const prev = map.get(id)!;
        prev.soLuong += qty;
        prev.thanhTien += val;
      } else {
        map.set(id, {
          id,
          maSku: item.code,
          tenHang: item.tenHang,
          donVi: item.donVi,
          soLuong: qty,
          donGia: price,
          thanhTien: val,
        });
      }
    }

    // Tính lại đơn giá bình quân gia quyền từ tổng thành tiền / tổng số lượng
    const lines = Array.from(map.values()).map(item => {
      return {
        ...item,
        donGia: item.soLuong > 0 ? Math.round(item.thanhTien / item.soLuong) : 0,
      };
    }).sort((a, b) => b.thanhTien - a.thanhTien);

    return NextResponse.json(lines);
  } catch (e: unknown) {
    console.error("[GET /reports/bao-cao-ban-hang]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
