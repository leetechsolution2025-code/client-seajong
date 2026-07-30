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

    const [contracts, saleOrders, retailInvoices, materialTasks, inboundTasks, batchPickingTasks, logisticsTickets] = await Promise.all([
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
      // Đơn bán hàng đang thực hiện và ĐÃ ĐƯỢC KẾ TOÁN DUYỆT (Bao gồm cả đang sản xuất để xuất hàng hoá)
      prisma.saleOrder.findMany({
        where: { 
          trangThai: { in: ["active", "confirmed", "processing", "in_production", "approved"] },
          keToanDuyet: "approved"
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, code: true, trangThai: true,
          tongTien: true,
          customer: { select: { name: true } },
          logisticsTickets: { select: { id: true } } // Fetch to check if it already has tickets
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
      // Lệnh nhập kho thành phẩm (Task)
      prisma.task.findMany({
        where: {
          deptCode: "logistics",
          status: "pending",
          title: { contains: "Nhập kho thành phẩm" }
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, title: true, status: true,
          actualResult: true, createdAt: true
        }
      }),
      // Task gom hàng
      prisma.task.findMany({
        where: {
          deptCode: "logistics",
          title: { contains: "Gom hàng" }
        },
        select: { actualResult: true }
      }),
      // Logistics Tickets (MỚI)
      (prisma as any).logisticsTicket.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, code: true, status: true, type: true, createdAt: true,
          saleOrder: { select: { id: true, code: true, ngayGiao: true, customer: { select: { name: true } } } },
          items: {
            select: {
              requestedQty: true,
              pickedQty: true,
              inventoryItem: { select: { tenHang: true, donVi: true } }
            }
          }
        }
      })
    ]);

    const assignedOrderIds = new Set<string>();
    batchPickingTasks.forEach(t => {
      try {
        if (t.actualResult) {
          const ids = JSON.parse(t.actualResult);
          if (Array.isArray(ids)) {
            ids.forEach(id => assignedOrderIds.add(id));
          }
        }
      } catch (e) {}
    });

    const result = [
      ...logisticsTickets.map((t: any) => ({
        id:        t.id,
        code:      t.code,
        type:      "logistics-ticket" as const,
        typeLabel: t.type === "BATCH_PACKING" ? "Gom hàng & đóng gói" : "Cấp phát vật tư",
        customer:  t.saleOrder?.customer?.name ?? null,
        tongTien:  null,
        trangThai: t.status,
        isAssigned: assignedOrderIds.has(t.id),
        ticketType: t.type,
        saleOrderId: t.saleOrder?.id,
        saleOrderCode: t.saleOrder?.code,
        requestedDate: t.type === "BATCH_PACKING" ? (t.saleOrder?.ngayGiao ?? t.createdAt) : t.createdAt,
        items: t.items?.map((it: any) => ({
          tenHang: it.inventoryItem?.tenHang || "Vật tư",
          soLuong: it.requestedQty || 0,
          requestedQty: it.requestedQty || 0,
          pickedQty: it.pickedQty || 0,
          donVi: it.inventoryItem?.donVi || "cái"
        }))
      })),
      ...contracts.map(c => ({
        id:        c.id,
        code:      c.code,
        type:      "contract" as const,
        typeLabel: "Hợp đồng",
        customer:  c.customer?.name ?? null,
        tongTien:  c.giaTriHopDong,
        trangThai: c.trangThai,
        isAssigned: assignedOrderIds.has(c.id)
      })),
      // Lọc bỏ saleOrder nếu đã được tạo LogisticsTicket
      ...saleOrders.filter(so => so.logisticsTickets.length === 0).map(so => ({
        id:        so.id,
        code:      so.code,
        type:      "sale-order" as const,
        typeLabel: "Đơn bán hàng",
        customer:  so.customer?.name ?? null,
        tongTien:  so.tongTien,
        trangThai: so.trangThai,
        isAssigned: assignedOrderIds.has(so.id)
      })),
      ...retailInvoices.map(inv => ({
        id:        inv.id,
        code:      inv.code,
        type:      "retail-invoice" as const,
        typeLabel: "Hoá đơn bán lẻ",
        customer:  inv.tenKhach ?? null,
        tongTien:  inv.tongCong,
        trangThai: inv.trangThai,
        isAssigned: assignedOrderIds.has(inv.id)
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
      ...inboundTasks.map(t => {
        let parsedItems = [];
        try {
          if (t.actualResult) parsedItems = JSON.parse(t.actualResult);
        } catch(e) {}
        
        const qcCodeMatch = t.title.match(/\((QC-\S+)\)/);
        const code = qcCodeMatch ? qcCodeMatch[1] : "OQC";

        return {
          id:        t.id,
          code:      code,
          type:      "material-import" as const,
          typeLabel: "Nhập kho thành phẩm",
          customer:  null,
          tongTien:  null,
          trangThai: t.status,
          items:     parsedItems,
        };
      }),
    ];

    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error("[GET /overview-orders]", e);
    return NextResponse.json([], { status: 500 });
  }
}
