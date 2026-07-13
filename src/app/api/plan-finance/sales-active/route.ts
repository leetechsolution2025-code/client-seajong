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

    const [contracts, saleOrders, retailInvoices, materialTasks] = await Promise.all([
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
      // Đơn bán hàng đang thực hiện và ĐÃ ĐƯỢC KẾ TOÁN DUYỆT
      prisma.saleOrder.findMany({
        where: { 
          trangThai: { in: ["active", "confirmed", "processing"] },
          keToanDuyet: "approved"
        },
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
      // Lệnh xuất kho vật tư phụ kiện (Task)
      prisma.task.findMany({
        where: {
          deptCode: "logistics",
          status: "pending",
          title: { contains: "Lệnh xuất kho KVP" }
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, title: true, status: true,
          actualResult: true, createdAt: true
        }
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
      ...materialTasks.map(t => {
        let parsedItems = [];
        try {
          if (t.actualResult) parsedItems = JSON.parse(t.actualResult);
        } catch(e) {}
        
        // Cố gắng trích xuất mã đơn từ title "Lệnh xuất kho KVP cho đơn hàng SO-..."
        const orderCodeMatch = t.title.match(/cho đơn hàng (SO-\S+)/);
        const orderCode = orderCodeMatch ? orderCodeMatch[1] : "KVP";

        return {
          id:        t.id,
          code:      orderCode,
          type:      "material-export" as const,
          typeLabel: "Lệnh xuất kho KVP",
          customer:  null,
          tongTien:  null,
          trangThai: t.status,
          items:     parsedItems,
        };
      }),
    ];

    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error("[GET /sales-active]", e);
    return NextResponse.json([], { status: 500 });
  }
}
