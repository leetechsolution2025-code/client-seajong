import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { ticketIds, newDate } = body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0 || !newDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Parse the newDate to make sure it's valid
    const parsedDate = new Date(newDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Start a transaction for consistent updates
    await prisma.$transaction(async (tx) => {
      // LogisticsTicket does not have `ngayGiao` field, it relies on `SaleOrder`.
      // So we skip updating LogisticsTicket directly and only update SaleOrder.

      // 2. Fetch the updated tickets to potentially update SaleOrders
      const tickets = await (tx as any).logisticsTicket.findMany({
        where: { id: { in: ticketIds } },
        select: { saleOrderId: true }
      });
      
      const saleOrderIds = Array.from(new Set(tickets.map((t: any) => t.saleOrderId).filter(Boolean))) as string[];
      let allAffectedTicketIds = [...ticketIds];

      if (saleOrderIds.length > 0) {
        await tx.saleOrder.updateMany({
          where: { id: { in: saleOrderIds } },
          data: { ngayGiao: parsedDate }
        });

        // Lấy tất cả các ticket khác thuộc cùng SaleOrder này
        const relatedTickets = await (tx as any).logisticsTicket.findMany({
          where: { saleOrderId: { in: saleOrderIds } },
          select: { id: true }
        });
        
        relatedTickets.forEach((rt: any) => {
          if (!allAffectedTicketIds.includes(rt.id)) {
            allAffectedTicketIds.push(rt.id);
          }
        });
      }

      // 3. Find Tasks related to ALL affected tickets
      const tasks = await tx.task.findMany({
        where: { deptCode: "logistics", status: { notIn: ["done", "cancelled"] } },
        select: { id: true, actualResult: true, dueDate: true }
      });

      const tasksToUpdate: string[] = [];
      for (const task of tasks) {
        if (!task.actualResult) continue;
        try {
          const parsed = JSON.parse(task.actualResult);
          if (Array.isArray(parsed) && parsed.some(id => allAffectedTicketIds.includes(id))) {
            tasksToUpdate.push(task.id);
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      if (tasksToUpdate.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: tasksToUpdate } },
          data: { dueDate: parsedDate }
        });
      }
    });

    return NextResponse.json({ success: true, message: "Deadline updated successfully" });
  } catch (error: any) {
    console.error("[PATCH /api/logistics/tickets/update-deadline]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
