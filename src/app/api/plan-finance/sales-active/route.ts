import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/plan-finance/sales-active
 * Trả về danh sách các hợp đồng, đơn bán hàng, hoá đơn bán lẻ
 * đang ở trạng thái "đang thực hiện" để dùng trong xuất kho theo đơn bán hàng.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [contracts, saleOrders, retailInvoices] = await Promise.all([
      // Hợp đồng đang thực hiện
      prisma.contract.findMany({
        where: { trangThai: "active" },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, code: true, trangThai: true,
          giaTriHopDong: true,
          customer: { select: { name: true } },
        },
      }),
      // Đơn bán hàng đang thực hiện (trangThai = "active" hoặc "confirmed")
      prisma.saleOrder.findMany({
        where: { trangThai: { in: ["active", "confirmed", "processing"] } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, code: true, trangThai: true,
          tongTien: true,
          customer: { select: { name: true } },
        },
      }),
      // Hoá đơn bán lẻ chưa thanh toán hết / còn nợ
      prisma.retailInvoice.findMany({
        where: { trangThai: { in: ["partial", "pending", "unpaid"] } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, code: true, trangThai: true,
          tongCong: true, tenKhach: true,
        },
      }),
    ]);

    const result = [
      ...contracts.map(c => ({
        id:        c.id,
        code:      c.code,
        type:      "contract" as const,
        typeLabel: "Hợp đồng",
        customer:  c.customer?.name ?? null,
        tongTien:  c.giaTriHopDong,
        trangThai: c.trangThai,
      })),
      ...saleOrders.map(so => ({
        id:        so.id,
        code:      so.code,
        type:      "sale-order" as const,
        typeLabel: "Đơn bán hàng",
        customer:  so.customer?.name ?? null,
        tongTien:  so.tongTien,
        trangThai: so.trangThai,
      })),
      ...retailInvoices.map(inv => ({
        id:        inv.id,
        code:      inv.code,
        type:      "retail-invoice" as const,
        typeLabel: "Hoá đơn bán lẻ",
        customer:  inv.tenKhach ?? null,
        tongTien:  inv.tongCong,
        trangThai: inv.trangThai,
      })),
    ];

    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error("[GET /sales-active]", e);
    return NextResponse.json([], { status: 500 });
  }
}
