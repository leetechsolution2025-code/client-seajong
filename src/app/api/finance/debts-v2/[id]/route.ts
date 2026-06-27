import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { partnerName, amount, paidAmount, dueDate, interestRate, status, description, referenceId } = body;

    const debt = await (prisma.debt as any).update({
      where: { id },
      data: {
        partnerName,
        amount: Number(amount),
        paidAmount: Number(paidAmount),
        dueDate: dueDate ? new Date(dueDate) : null,
        interestRate: interestRate ? Number(interestRate) : null,
        status,
        description,
        referenceId,
      }
    });

    // Sync paidAmount to SaleOrder or Contract if referenceId is set
    if (referenceId) {
      const pAmt = Number(paidAmount) || 0;
      try {
        const order = await prisma.saleOrder.findFirst({
          where: {
            OR: [
              { id: referenceId },
              { code: referenceId }
            ]
          }
        });
        if (order) {
          await prisma.saleOrder.update({
            where: { id: order.id },
            data: { daThanhToan: pAmt }
          });
        }
      } catch (err) {
        console.error("Failed to sync paidAmount to SaleOrder:", err);
      }

      try {
        const contract = await prisma.contract.findFirst({
          where: {
            OR: [
              { id: referenceId },
              { code: referenceId }
            ]
          }
        });
        if (contract) {
          await prisma.contract.update({
            where: { id: contract.id },
            data: { daThanhToan: pAmt }
          });
        }
      } catch (err) {
        console.error("Failed to sync paidAmount to Contract:", err);
      }
    }

    return NextResponse.json(debt);
  } catch (error: any) {
    console.error("Update debt error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.debt.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete debt error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
