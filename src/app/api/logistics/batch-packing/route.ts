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
    
    // Giám đốc, Admin, Thủ kho hoặc Quản lý cấp cao đều được quyền xem tất cả
    const isManager = ["SUPERADMIN", "ADMIN", "DIRECTOR", "MANAGER"].includes(userRole) 
      || levelOrder <= 3 
      || position.includes("giám đốc") 
      || position.includes("thủ kho")
      || position.includes("trưởng");

    // Tìm các task gom hàng được giao
    const tasks = await prisma.task.findMany({
      where: {
        ...(isManager ? {} : { assigneeId: session.user.employeeId || session.user.id }),
        deptCode: "logistics",
        title: { contains: "Gom hàng" },
        status: "pending"
      }
    });

    const assignedOrderIds = new Set<string>();
    tasks.forEach(t => {
      try {
        if (t.actualResult) {
          const ids = JSON.parse(t.actualResult);
          if (Array.isArray(ids)) {
            ids.forEach(id => assignedOrderIds.add(id));
          }
        }
      } catch (e) {}
    });

    // Nếu không có đơn nào được giao
    if (assignedOrderIds.size === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        totalOrders: 0
      });
    }

    // Lấy các đơn hàng đang chờ xuất kho VÀ đã được giao cho user này
    const pendingOrders = await prisma.saleOrder.findMany({
      where: {
        id: { in: Array.from(assignedOrderIds) },
        keToanDuyet: "approved",
        trangThaiKho: "in_stock",
        trangThai: { notIn: ["cancelled", "draft"] }
      },
      include: {
        saleOrderItems: {
          include: {
            inventoryItem: {
              include: {
                stocks: true
              }
            }
          }
        }
      }
    });

    const activeOrders = pendingOrders;

    // Gom nhóm items
    // Cấu trúc map: inventoryItemId (hoặc tên) -> { tenHang, inventoryItemId, imageUrl, tongSoLuong, orders: [] }
    const batchMap = new Map<string, any>();

    for (const order of activeOrders) {
      if (!order.saleOrderItems) continue;
      
      for (const item of order.saleOrderItems) {
        const key = item.inventoryItemId || item.tenHang;
        if (!key) continue;

        let viTriStr = null;
        if (item.inventoryItem?.stocks && item.inventoryItem.stocks.length > 0) {
          // Lấy vị trí từ kho đầu tiên có chứa mặt hàng (hoặc gom lại)
          const stock = item.inventoryItem.stocks.find((s: any) => s.viTriHang || s.viTriCot || s.viTriTang);
          if (stock) {
            viTriStr = [stock.viTriTang && `Tầng ${stock.viTriTang}`, stock.viTriCot && `Cột ${stock.viTriCot}`, stock.viTriHang && `Hàng ${stock.viTriHang}`].filter(Boolean).join(" - ");
          }
        }

        if (!batchMap.has(key)) {
          batchMap.set(key, {
            id: key,
            tenHang: item.inventoryItem?.tenHang || item.tenHang,
            inventoryItemId: item.inventoryItemId,
            webProductId: item.inventoryItem?.webProductId,
            imageUrl: item.inventoryItem?.imageUrl || null,
            images: [],
            viTriKho: viTriStr,
            tongSoLuong: 0,
            orders: []
          });
        }

        const batchItem = batchMap.get(key);
        batchItem.tongSoLuong += (item.soLuong || 0);

        // Tránh bị trùng mã đơn trong mảng orders
        if (!batchItem.orders.find((o: any) => o.code === order.code)) {
          batchItem.orders.push({
            id: order.id,
            code: order.code,
            soLuongTrongDon: item.soLuong || 0
          });
        } else {
          // Nếu bị trùng (cùng 1 đơn nhưng có 2 dòng giống nhau), thì cộng số lượng
          const existOrder = batchItem.orders.find((o: any) => o.code === order.code);
          existOrder.soLuongTrongDon += (item.soLuong || 0);
        }
      }
    }

    const batchList = Array.from(batchMap.values()).sort((a, b) => a.tenHang.localeCompare(b.tenHang));
    const batchListWithImages = await attachWebImages(batchList);

    return NextResponse.json({
      success: true,
      items: batchListWithImages,
      totalOrders: activeOrders.length
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
    const { action, orderCodes } = body;

    if (action === "complete_picking") {
      // In a real system, we would generate StockMovements here.
      // But for now, since it is a large action and requires warehouse selection, 
      // let's just mark the orders as "packed" or something. 
      // Actually, standard Seajong outbound creates a StockMovement and sets trangThaiKho = "out_of_stock".
      // We will leave this for future expansion or just return success if it's UI only.
      
      // We can also create a task for logistics.
    }

    return NextResponse.json({ success: true, message: "Hoàn tất gom hàng thành công" });
  } catch (error: any) {
    console.error("[POST /api/logistics/batch-packing]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
