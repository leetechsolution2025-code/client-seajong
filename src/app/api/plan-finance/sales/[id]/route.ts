import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plan-finance/sales/[id] — chi tiết đơn bán hàng kèm items
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const order = await prisma.saleOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        // Nếu SaleOrder có items relation — include nếu có
        // items: true,
      },
    });

    if (!order) return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    return NextResponse.json(order);
  } catch (e: unknown) {
    console.error("[GET /sales/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
