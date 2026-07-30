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

    // Lấy thông tin orders để ghép vào title/description và tính dueDate
    const orders = await prisma.saleOrder.findMany({
      where: { id: { in: orderIds } },
      select: { code: true, ngayGiao: true }
    });
    
    // Lấy thêm thông tin nếu orderIds chứa ID của LogisticsTicket
    const tickets = await (prisma as any).logisticsTicket.findMany({
      where: { id: { in: orderIds } },
      select: { code: true, createdAt: true, saleOrder: { select: { ngayGiao: true } } }
    });

    let codes: string[] = [];
    let maxDueDate = new Date(0);

    orders.forEach(o => {
      if (o.code) codes.push(o.code);
      if (o.ngayGiao && new Date(o.ngayGiao) > maxDueDate) maxDueDate = new Date(o.ngayGiao);
    });

    tickets.forEach(t => {
      if (t.code) codes.push(t.code);
      if (t.createdAt && new Date(t.createdAt) > maxDueDate) maxDueDate = new Date(t.createdAt);
      if (t.saleOrder?.ngayGiao && new Date(t.saleOrder.ngayGiao) > maxDueDate) maxDueDate = new Date(t.saleOrder.ngayGiao);
    });

    const codeList = Array.from(new Set(codes)).join(", ");
    const dueDate = maxDueDate.getTime() > 0 ? maxDueDate : undefined;

    // Lấy thông tin user liên kết với nhân viên này (nếu có) để tạo Task cho đúng ID của User
    const employee = await prisma.employee.findUnique({
      where: { id: staffId },
      select: { userId: true }
    });
    const taskAssigneeId = employee?.userId || staffId;

    // Tạo Task chung cho sự kiện giao việc (theo dõi tiến độ)
    const task = await prisma.task.create({
      data: {
        title: `Gom hàng: ${codeList}`,
        description: `Danh sách mã đơn/phiếu: ${codeList}`,
        status: "pending",
        priority: "high",
        deptCode: "logistics",
        assigneeId: taskAssigneeId,
        creatorId: session.user.id,
        dueDate: dueDate,
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
      data: { assigneeId: taskAssigneeId }
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("[POST /api/logistics/batch-packing/assign]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
