import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { attachWebImages } from "@/lib/sync-utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session.user.role || "").toUpperCase();
    const levelOrder = session.user.levelOrder ?? 99;
    const position = (session.user.positionName || "").toLowerCase();
    
    // Phân quyền: Giám đốc, Admin, Thủ kho, Quản lý cấp cao
    const isManager = ["SUPERADMIN", "ADMIN", "DIRECTOR", "MANAGER"].includes(userRole) 
      || levelOrder <= 3 
      || position.includes("giám đốc") 
      || position.includes("thủ kho")
      || position.includes("trưởng");

    const employeeId = session.user.employeeId || session.user.id;

    // Lấy các Phiếu Gom Hàng (BATCH_PACKING)
    const tickets = await (prisma as any).logisticsTicket.findMany({
      where: {
        type: "BATCH_PACKING",
        status: { in: ["PENDING", "PICKING"] },
        ...(isManager ? {} : { assignedToId: employeeId }) // Chỉ hiển thị phiếu của mình nếu không phải Manager
      },
      include: {
        saleOrder: { select: { code: true, ngayGiao: true } },
        items: {
          include: {
            inventoryItem: {
              include: {
                stocks: true
              }
            }
          }
        },
        assignedTo: { select: { fullName: true } }
      }
    });

    // Cấu trúc map: inventoryItemId (hoặc tên) -> { tenHang, inventoryItemId, imageUrl, tongSoLuong, orders: [] }
    const batchMap = new Map<string, any>();

    for (const ticket of tickets) {
      let items = ticket.items || [];
      
      // Fallback cho ticket bị lỗi thiếu mã vật tư (không có item trong CSDL)
      if (items.length === 0 && ticket.saleOrder?.code) {
        const task = await prisma.task.findFirst({
          where: { deptCode: "logistics", title: { contains: ticket.saleOrder.code } }
        });
        if (task && task.actualResult) {
          try {
            const parsed = JSON.parse(task.actualResult);
            const relevantItems = parsed.filter((it: any) => it.type === "Kho Hàng Hoá (KHO-CHINH)");
            for (const p of relevantItems) {
              const matchedInvItem = await prisma.inventoryItem.findFirst({
                where: { tenHang: p.tenHang }
              });
              items.push({
                id: `fallback-${ticket.id}-${p.tenHang}`,
                inventoryItemId: null,
                requestedQty: p.soLuong || 1,
                inventoryItem: {
                  tenHang: p.tenHang,
                  donVi: p.donVi,
                  imageUrl: matchedInvItem?.imageUrl || null,
                  code: matchedInvItem?.code || null,
                  webProductId: matchedInvItem?.webProductId || null,
                  stocks: []
                }
              } as any);
            }
          } catch (e) {}
        }
      }

      if (items.length === 0) continue;
      
      for (const item of items) {
        const rawKey = item.inventoryItemId || item.id;
        if (!rawKey) continue;
        const ngayGiaoStr = ticket.saleOrder?.ngayGiao ? new Date(ticket.saleOrder.ngayGiao).toISOString() : "Không hẹn ngày";
        const key = `${ngayGiaoStr}_${rawKey}`;

        let viTriStr = null;
        if (item.inventoryItem?.stocks && item.inventoryItem.stocks.length > 0) {
          const stock = item.inventoryItem.stocks.find((s: any) => s.viTriHang || s.viTriCot || s.viTriTang);
          if (stock) {
            viTriStr = [stock.viTriTang && `Tầng ${stock.viTriTang}`, stock.viTriCot && `Cột ${stock.viTriCot}`, stock.viTriHang && `Hàng ${stock.viTriHang}`].filter(Boolean).join(" - ");
          }
        }

        if (!batchMap.has(key)) {
          batchMap.set(key, {
            id: key,
            ticketItemId: item.id, // For reporting picked quantity
            tenHang: item.inventoryItem?.tenHang || "Hàng hóa",
            inventoryItemId: item.inventoryItemId,
            code: item.inventoryItem?.code,
            webProductId: item.inventoryItem?.webProductId,
            imageUrl: item.inventoryItem?.imageUrl || null,
            images: [],
            viTriKho: viTriStr,
            tongSoLuong: 0,
            ngayGiao: ticket.saleOrder?.ngayGiao,
            orders: []
          });
        }

        const batchItem = batchMap.get(key);
        batchItem.tongSoLuong += (item.requestedQty || 0);

        // Map order info
        batchItem.orders.push({
          id: ticket.id,
          code: ticket.saleOrder?.code || ticket.code,
          soLuongTrongDon: item.requestedQty || 0,
          ngayGiao: ticket.saleOrder?.ngayGiao,
          assignedTo: ticket.assignedTo?.fullName
        });
      }
    }

    const batchList = Array.from(batchMap.values()).sort((a, b) => a.tenHang.localeCompare(b.tenHang));
    const batchListWithImages = await attachWebImages(batchList);

    return NextResponse.json({
      success: true,
      items: batchListWithImages,
      totalOrders: tickets.length,
      isManager // Trả về cờ này để UI biết có hiển thị tính năng giao việc không
    });

  } catch (error: any) {
    console.error("[GET /api/logistics/batch-packing]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, ticketId, ticketIds, employeeId, orderCodes } = body;

    if (action === "assign_ticket") {
      const idsToUpdate = ticketIds || (ticketId ? [ticketId] : []);
      if (idsToUpdate.length === 0 || !employeeId) {
         return NextResponse.json({ error: "Thiếu thông tin phân công" }, { status: 400 });
      }
      
      await (prisma as any).logisticsTicket.updateMany({
        where: { id: { in: idsToUpdate } },
        data: { assignedToId: employeeId }
      });
      return NextResponse.json({ success: true, message: "Phân công thành công" });
    }

    if (action === "complete_picking") {
      // In a real system, we would generate StockMovements here.
      // But for now, we will just update the ticket status if ticketId is provided.
      if (ticketId) {
         await (prisma as any).logisticsTicket.update({
            where: { id: ticketId },
            data: { status: "PACKED" }
         });
      }
    }

    return NextResponse.json({ success: true, message: "Thao tác thành công" });
  } catch (error: any) {
    console.error("[POST /api/logistics/batch-packing]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
