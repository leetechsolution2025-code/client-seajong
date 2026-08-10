import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { disbursementNumber, amount, disbursementDate, termMonths, maturityDate, interestRate, interestType, repaymentMethod, purpose, status, paidPrincipal, paidInterest } = body;

    const updatedDisbursement = await (prisma as any).bankDisbursement.update({
      where: { id },
      data: {
        disbursementNumber,
        amount: amount !== undefined ? Number(amount) : undefined,
        disbursementDate: disbursementDate ? new Date(disbursementDate) : undefined,
        termMonths: termMonths !== undefined ? Number(termMonths) : undefined,
        maturityDate: maturityDate ? new Date(maturityDate) : null,
        interestRate: interestRate !== undefined ? Number(interestRate) : null,
        interestType,
        repaymentMethod,
        purpose,
        status,
        paidPrincipal: paidPrincipal !== undefined ? Number(paidPrincipal) : undefined,
        paidInterest: paidInterest !== undefined ? Number(paidInterest) : undefined,
      },
    });

    return NextResponse.json(updatedDisbursement);
  } catch (error: any) {
    console.error("PUT /api/finance/bank-disbursements/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (prisma as any).bankDisbursement.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
