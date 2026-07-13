import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Lệnh sản xuất đang chạy
    const runningOrdersCount = await prisma.saleOrder.count({
      where: {
        trangThai: "in_production"
      }
    });

    // 2. Sản lượng trong ngày (Đơn đã hoàn thành sản xuất hôm nay)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedTodayOrders = await prisma.saleOrder.findMany({
      where: {
        trangThai: { in: ["approved", "shipped"] },
        ngayHoanThanhSanXuat: {
          gte: today
        }
      },
      include: {
        saleOrderItems: true
      }
    });

    const todayProductionQty = completedTodayOrders.reduce((total, order) => {
      const orderQty = order.saleOrderItems.reduce((sum, item) => sum + item.soLuong, 0);
      return total + orderQty;
    }, 0);

    return NextResponse.json({
      runningOrders: runningOrdersCount,
      todayProductionQty: todayProductionQty,
      oee: 0, // Chưa có dữ liệu thực tế trong DB
      defectRate: 0 // Chưa có dữ liệu thực tế trong DB
    });
  } catch (e) {
    console.error("[GET /api/production/dashboard/kpis]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
