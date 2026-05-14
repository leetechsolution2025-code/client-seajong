import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plan-finance/retail-invoices/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const invoice = await prisma.retailInvoice.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true },
            },
          },
        },
      },
    });

    if (!invoice) return NextResponse.json({ error: "Không tìm thấy hoá đơn" }, { status: 404 });
    return NextResponse.json(invoice);
  } catch (e: unknown) {
    console.error("[GET /retail-invoices/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
