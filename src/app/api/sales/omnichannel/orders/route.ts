import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const orders = await prisma.omnichannelOrder.findMany({
      include: {
        channel: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Chuyển đổi định dạng dữ liệu để khớp với frontend
    const formattedOrders = await Promise.all(orders.map(async (order: any) => {
      // Dùng $queryRaw để bypass lỗi cache của Prisma Client (khi chưa nhận diện được model mới)
      const items: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM OmnichannelOrderItem WHERE orderId = ?`, 
        order.id
      );

      return {
        id: order.id,
        externalId: order.externalOrderId,
        customer: order.customerName || "Khách hàng Shopee",
        phone: order.customerPhone || "09x-xxx-xxxx",
        address: order.customerAddress || "Địa chỉ chưa cập nhật",
        amount: order.totalAmount,
        status: order.orderStatus || "Chờ xác nhận",
        channel: order.channel.platform === "SHOPEE" ? "Shopee" : order.channel.platform,
        createdAt: new Date(order.createdAt).toISOString().split('T')[0],
        shippingDate: new Date(order.updatedAt).toISOString().split('T')[0],
        items: items.map((item: any) => ({
          id: item.id,
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
          variant: item.variantName,
          image: item.imageUrl
        }))
      };
    }));

    return NextResponse.json(formattedOrders);
  } catch (error: any) {
    console.error("CRITICAL API ERROR:", error.message, error.stack);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error.message 
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { ids, status } = await request.json();

    if (!ids || !Array.isArray(ids) || !status) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    await prisma.omnichannelOrder.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        orderStatus: status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating omnichannel orders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
