import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { staffId, orderIds } = body;

    if (!staffId || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "Missing staffId or orderIds" }, { status: 400 });
    }

    // Lấy thông tin orders để ghép vào title/description
    const orders = await prisma.saleOrder.findMany({
      where: { id: { in: orderIds } },
      select: { code: true }
    });
    
    // Nếu không phải là sale order thì lấy contract/retail invoices (tuỳ logic, giả sử saleOrder là chính)
    // Ở đây ta cứ lưu mảng orderIds vào actualResult
    const codeList = orders.map(o => o.code).join(", ");

    // Tạo Task chung cho sự kiện giao việc (theo dõi tiến độ)
    const task = await prisma.task.create({
      data: {
        title: `Gom hàng cho các lệnh xuất kho`,
        description: `Danh sách mã đơn: ${codeList}`,
        status: "pending",
        priority: "high",
        deptCode: "logistics",
        assigneeId: staffId,
        creatorId: session.user.id,
        actualResult: JSON.stringify(orderIds)
      }
    });

    // Quan trọng: Phải cập nhật người phụ trách (assignee) trực tiếp vào chính các Phiếu điều phối
    // 1. Cập nhật cho bảng LogisticsTicket (phiên bản mới)
    await (prisma as any).logisticsTicket.updateMany({
      where: { id: { in: orderIds } },
      data: { assignedToId: staffId }
    });

    // 2. Cập nhật cho bảng Task (phiên bản cũ, các lệnh material-export được lưu dưới dạng Task)
    await prisma.task.updateMany({
      where: { id: { in: orderIds }, deptCode: "logistics" },
      data: { assigneeId: staffId }
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("[POST /api/logistics/batch-packing/assign]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
