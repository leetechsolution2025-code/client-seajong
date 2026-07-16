import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const date = searchParams.get('date') || '';
    const todayCompleted = searchParams.get('todayCompleted') === 'true';

    // Lấy các SaleOrder được duyệt (kế toán duyệt)
    const orders = await prisma.saleOrder.findMany({
      where: {
        keToanDuyet: "approved",
      },
      orderBy: { updatedAt: 'desc' },
      take: 100, // Tăng limit để có thể lọc
      include: {
        saleOrderItems: true
      }
    });

    let result = orders.map(order => {
      // Phân loại trạng thái lệnh sản xuất dựa trên trạng thái đơn hàng
      const isCompleted = order.trangThai === "approved" || order.trangThai === "shipped" || order.trangThai === "completed";
      const isRunning = order.trangThai === "in_production";
      
      const qty = order.saleOrderItems.reduce((sum: number, item: any) => sum + item.soLuong, 0);
      const name = order.saleOrderItems.map((i: any) => i.tenHang).join(", ");

      const orderCode = order.code ? order.code.replace('DHBL', 'LSX') : order.id;

      return {
        id: orderCode,
        ngayHoanThanh: order.ngayHoanThanhSanXuat || order.ngayGiao || null,
        progress: isCompleted ? 100 : 0,
        status: isCompleted ? "completed" : (isRunning ? "running" : "pending"),
        updatedAt: order.updatedAt,
        name: name
      };
    });

    if (q) {
      result = result.filter(r => r.id.toLowerCase().includes(q.toLowerCase()) || r.name.toLowerCase().includes(q.toLowerCase()));
    }
    if (status) {
      result = result.filter(r => r.status === status);
    }
    if (date) {
      result = result.filter(r => {
        if (!r.ngayHoanThanh) return false;
        const targetDate = new Date(r.ngayHoanThanh).toISOString().split('T')[0];
        return targetDate === date;
      });
    }
    if (todayCompleted) {
      const todayStr = new Date().toISOString().split('T')[0];
      result = result.filter(r => r.status === 'completed' && r.updatedAt.toISOString().split('T')[0] === todayStr);
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/production/dashboard/recent-orders]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
