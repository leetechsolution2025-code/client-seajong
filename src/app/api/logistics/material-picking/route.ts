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
      || levelOrder < 3 
      || position.includes("giám đốc") 
      || position.includes("thủ kho")
      || position.includes("trưởng");

    const employeeId = session.user.employeeId || session.user.id;

    // Lấy các Phiếu Cấp phát vật tư (MATERIAL_PICKING)
    const tickets = await (prisma as any).logisticsTicket.findMany({
      where: {
        type: "MATERIAL_PICKING",
        status: { in: ["PENDING", "PICKING", "PACKED"] },
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

    const batchMap = new Map<string, any>();

    for (const ticket of tickets) {
      let items = ticket.items || [];
      
      // Fallback cho ticket bị lỗi thiếu mã vật tư (không có item trong CSDL)
      if (items.length === 0 && ticket.saleOrder?.code) {
        const task = await (prisma as any).task.findFirst({
          where: { deptCode: "logistics", title: { contains: ticket.saleOrder.code } }
        });
        if (task && task.actualResult) {
          try {
            const parsed = JSON.parse(task.actualResult);
            const relevantItems = parsed.filter((it: any) => it.type === "Kho Vật Tư Phụ Kiện (KVP)");
            for (const p of relevantItems) {
              const matchedInvItem = await (prisma as any).inventoryItem.findFirst({
                where: { tenHang: p.tenHang },
                include: { stocks: true }
              });
              
              if (matchedInvItem) {
                // Tự động vá lỗi vào DB luôn
                const newItem = await (prisma as any).logisticsTicketItem.create({
                  data: {
                    ticketId: ticket.id,
                    inventoryItemId: matchedInvItem.id,
                    requestedQty: p.soLuong || 1,
                    pickedQty: 0
                  },
                  include: {
                    inventoryItem: { include: { stocks: true } }
                  }
                });
                items.push(newItem);
              } else {
                // Nếu vẫn ko map được, fallback tạm
                items.push({
                  id: `fallback-${ticket.id}-${p.tenHang}`,
                  inventoryItemId: null,
                  requestedQty: p.soLuong || 1,
                  inventoryItem: {
                    tenHang: p.tenHang,
                    donVi: p.donVi,
                    imageUrl: null,
                    code: null,
                    webProductId: null,
                    stocks: []
                  }
                } as any);
              }
            }
          } catch (e) {}
        }
      }

      if (items.length === 0) continue;
      
      for (const item of items) {
        const rawKey = item.inventoryItemId || item.id;
        if (!rawKey) continue;
        // Sử dụng ngày giao của đơn bán hàng thay vì mặc định là ngay lập tức
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
            ticketItemId: item.id,
            tenHang: item.inventoryItem?.tenHang || "Vật tư",
            inventoryItemId: item.inventoryItemId,
            code: item.inventoryItem?.code,
            webProductId: item.inventoryItem?.webProductId,
            imageUrl: item.inventoryItem?.imageUrl || null,
            images: [],
            viTriKho: viTriStr,
            tongSoLuong: 0,
            tongDaNhat: 0,
            ngayGiao: ticket.saleOrder?.ngayGiao, // Hiển thị ngày giao hàng thực tế
            orders: []
          });
        }

        const batchItem = batchMap.get(key);
        batchItem.tongSoLuong += (item.requestedQty || 0);
        batchItem.tongDaNhat += (item.pickedQty || 0);

        batchItem.orders.push({
          id: ticket.id,
          ticketItemId: item.id,
          code: ticket.saleOrder?.code || ticket.code,
          soLuongTrongDon: item.requestedQty || 0,
          ngayGiao: ticket.saleOrder?.ngayGiao,
          createdAt: ticket.createdAt,
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
      isManager
    });

  } catch (error: any) {
    console.error("[GET /api/logistics/material-picking]", error);
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
      const { pickedQuantities } = body;
      
      if (!pickedQuantities || Object.keys(pickedQuantities).length === 0) {
        return NextResponse.json({ error: "Không có dữ liệu báo cáo" }, { status: 400 });
      }

      const affectedTicketIds = new Set<string>();

      for (const [ticketItemId, addQty] of Object.entries(pickedQuantities)) {
        if (typeof addQty !== "number" || addQty < 0) continue;

        const ticketItem = await (prisma as any).logisticsTicketItem.findUnique({
          where: { id: ticketItemId },
          include: { ticket: true }
        });

        if (!ticketItem) continue;
        
        const currentPicked = ticketItem.pickedQty || 0;
        const delta = addQty - currentPicked;

        if (delta === 0) continue; // Không có sự thay đổi

        affectedTicketIds.add(ticketItem.ticketId);

        // Update pickedQty tuyệt đối
        await (prisma as any).logisticsTicketItem.update({
          where: { id: ticketItemId },
          data: { pickedQty: addQty }
        });

        // Reserve stock (Tăng/giảm số lượng Đã giữ dựa trên delta)
        const stocks = await (prisma as any).inventoryStock.findMany({
          where: { inventoryItemId: ticketItem.inventoryItemId },
          orderBy: { soLuong: "desc" }
        });
        
        if (stocks.length > 0) {
          const targetStock = stocks[0];
          // We no longer increment soLuongGiu here, as it's already reserved at order creation.

          // Lưu vết vào InventoryReservation
          const existingRes = await (prisma as any).inventoryReservation.findFirst({
            where: { ticketItemId, inventoryStockId: targetStock.id }
          });
          
          if (addQty === 0 && existingRes) {
            await (prisma as any).inventoryReservation.delete({
              where: { id: existingRes.id }
            });
          } else if (addQty > 0) {
            if (existingRes) {
              await (prisma as any).inventoryReservation.update({
                where: { id: existingRes.id },
                data: { reservedQty: addQty }
              });
            } else {
              await (prisma as any).inventoryReservation.create({
                data: { ticketItemId, inventoryStockId: targetStock.id, reservedQty: addQty }
              });
            }
          }
        }
      }

      // Đánh giá lại trạng thái của các lệnh bị ảnh hưởng
      for (const tId of affectedTicketIds) {
        const ticketItems = await (prisma as any).logisticsTicketItem.findMany({
          where: { ticketId: tId }
        });
        
        const allFullyPicked = ticketItems.length > 0 && ticketItems.every((it: any) => it.pickedQty >= it.requestedQty);
        
        if (allFullyPicked) {
           await (prisma as any).logisticsTicket.update({
             where: { id: tId },
             data: { status: "PACKED" }
           });
        } else {
           await (prisma as any).logisticsTicket.update({
             where: { id: tId },
             data: { status: "PICKING" }
           });
        }
        
        // Cập nhật trạng thái của Task giao việc liên quan
        const relatedTasks = await prisma.task.findMany({
          where: { deptCode: "logistics", actualResult: { contains: tId } }
        });
        
        for (const task of relatedTasks) {
          try {
            const orderIds = JSON.parse(task.actualResult || "[]");
            if (!Array.isArray(orderIds)) continue;
            
            const tickets = await (prisma as any).logisticsTicket.findMany({
              where: { id: { in: orderIds } },
              select: { status: true }
            });
            
            const allPacked = tickets.every((tk: any) => tk.status === "PACKED" || tk.status === "COMPLETED");
            if (allPacked && tickets.length > 0) {
              await prisma.task.update({
                where: { id: task.id },
                data: { status: "done", completedAt: new Date() }
              });
            } else if (tickets.some((tk: any) => tk.status === "PICKING" || tk.status === "PACKED" || tk.status === "COMPLETED")) {
              await prisma.task.update({
                where: { id: task.id },
                data: { status: "in_progress" }
              });
            }
          } catch(e) {}
        }
      }
    }

    return NextResponse.json({ success: true, message: "Thao tác thành công" });
  } catch (error: any) {
    console.error("[POST /api/logistics/material-picking]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
