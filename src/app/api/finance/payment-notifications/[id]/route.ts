import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const currentNotification = await prisma.paymentNotification.findUnique({
      where: { id },
    });

    if (!currentNotification) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (currentNotification.status === "verified") {
      return NextResponse.json(
        { error: "This notification is already verified" },
        { status: 400 }
      );
    }

    const updatedData: any = { status };
    if (status === "verified") {
      updatedData.verifiedById = session.user.id;
      updatedData.verifiedAt = new Date();
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.paymentNotification.update({
        where: { id },
        data: updatedData,
        include: {
          customer: { select: { id: true, name: true } },
          saleOrder: { select: { id: true, code: true, daThanhToan: true, keToanDuyet: true } },
        },
      });

      // If verified and linked to a sale order, update the order's paid amount
      if (status === "verified" && updated.saleOrderId) {
        await tx.saleOrder.update({
          where: { id: updated.saleOrderId },
          data: {
            daThanhToan: { increment: updated.amount },
          },
        });

        // Cập nhật Debt (nếu đơn hàng đã được Kế toán duyệt và có công nợ)
        const order = await tx.saleOrder.findUnique({ where: { id: updated.saleOrderId }, select: { code: true } });
        if (order && order.code) {
          const debts = await tx.debt.findMany({ where: { referenceId: order.code } });
          for (const debt of debts) {
            const newPaid = (debt.paidAmount || 0) + updated.amount;
            await tx.debt.update({
              where: { id: debt.id },
              data: {
                paidAmount: newPaid,
                status: newPaid >= debt.amount ? "PAID" : "PARTIAL",
              }
            });
          }
        }
      }

      // Ghi nhận doanh thu
      if (status === "verified") {
        await tx.revenue.create({
          data: {
            amount: updated.amount,
            source: updated.saleOrderId ? "SALE_ORDER" : "OTHER",
            referenceId: updated.saleOrderId || updated.id,
            description: `Thanh toán từ thông báo: ${updated.id}`,
          },
        });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error updating payment notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
