import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json({ orders: [] });
    }

    const orders = await prisma.saleOrder.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        createdAt: true,
        saleOrderItems: {
          select: {
            id: true,
            tenHang: true,
            inventoryItem: {
              select: {
                code: true,
                tenHang: true,
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[GET /api/sales/customer-orders]", error);
    return NextResponse.json({ orders: [] }, { status: 500 });
  }
}
