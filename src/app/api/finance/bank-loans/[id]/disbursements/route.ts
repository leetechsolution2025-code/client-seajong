import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: bankLoanId } = await context.params;
    const body = await request.json();
    const { disbursementNumber, amount, disbursementDate, termMonths, maturityDate, interestRate, interestType, repaymentMethod, purpose, status } = body;

    const newDisbursement = await (prisma as any).bankDisbursement.create({
      data: {
        bankLoanId,
        disbursementNumber,
        amount: Number(amount) || 0,
        disbursementDate: new Date(disbursementDate),
        termMonths: Number(termMonths) || 0,
        maturityDate: maturityDate ? new Date(maturityDate) : null,
        interestRate: interestRate ? Number(interestRate) : null,
        interestType,
        repaymentMethod,
        purpose,
        status: status || "UNPAID",
      },
    });

    return NextResponse.json(newDisbursement);
  } catch (error: any) {
    console.error("POST /api/finance/bank-loans/[id]/disbursements error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
