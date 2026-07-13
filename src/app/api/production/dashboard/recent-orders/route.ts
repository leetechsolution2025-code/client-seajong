import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Lấy các SaleOrder được duyệt (kế toán duyệt)
    const orders = await prisma.saleOrder.findMany({
      where: {
        keToanDuyet: "approved",
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        saleOrderItems: true
      }
    });

    const result = orders.map(order => {
      // Phân loại trạng thái lệnh sản xuất dựa trên trạng thái đơn hàng
      const isCompleted = order.trangThai === "approved" || order.trangThai === "shipped";
      const isRunning = order.trangThai === "in_production";
      
      const qty = order.saleOrderItems.reduce((sum: number, item: any) => sum + item.soLuong, 0);
      const name = order.saleOrderItems.map((i: any) => i.tenHang).join(", ");

      return {
        id: order.code || order.id,
        ngayHoanThanh: order.ngayHoanThanhSanXuat || order.ngayGiao || null,
        progress: isCompleted ? 100 : 0,
        status: isCompleted ? "completed" : (isRunning ? "running" : "pending"),
        updatedAt: order.updatedAt,
        name: name
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/production/dashboard/recent-orders]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
