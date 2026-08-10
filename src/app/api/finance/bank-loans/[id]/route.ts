import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const bankLoan = await (prisma as any).bankLoan.findUnique({
      where: { id },
      include: {
        disbursements: {
          orderBy: { disbursementDate: "desc" }
        }
      }
    });
    if (!bankLoan) {
      return NextResponse.json({ error: "Bank loan not found" }, { status: 404 });
    }
    return NextResponse.json(bankLoan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { contractNumber, bankName, loanType, creditLimit, startDate, maturityDate, collateralType, collateralValue, ltvRatio, status } = body;

    const updatedLoan = await (prisma as any).bankLoan.update({
      where: { id },
      data: {
        contractNumber,
        bankName,
        loanType,
        creditLimit: Number(creditLimit) || 0,
        startDate: startDate ? new Date(startDate) : null,
        maturityDate: maturityDate ? new Date(maturityDate) : null,
        collateralType,
        collateralValue: collateralValue ? Number(collateralValue) : null,
        ltvRatio: ltvRatio ? Number(ltvRatio) : null,
        status,
      },
    });

    return NextResponse.json(updatedLoan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (prisma as any).bankLoan.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
