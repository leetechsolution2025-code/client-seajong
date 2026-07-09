import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const loan = await prisma.bankLoan.create({
      data: {
        contractNumber: data.contractNumber,
        bankName: data.bankName,
        loanType: data.loanType,
        repaymentMethod: data.repaymentMethod,
        loanAmount: Number(data.loanAmount) || 0,
        disbursementDate: data.disbursementDate ? new Date(data.disbursementDate) : null,
        termMonths: data.termMonths ? Number(data.termMonths) : null,
        maturityDate: data.disbursementDate && data.termMonths ? new Date(new Date(data.disbursementDate).setMonth(new Date(data.disbursementDate).getMonth() + Number(data.termMonths))) : null,
        interestType: data.interestType,
        interestRate: data.interestRate ? Number(data.interestRate) : null,
        paymentFrequency: data.paymentFrequency,
        gracePeriodMonths: data.gracePeriodMonths ? Number(data.gracePeriodMonths) : 0,
        collateralType: data.collateralType || null,
        collateralValue: data.collateralValue ? Number(data.collateralValue) : null,
        ltvRatio: data.ltvRatio ? Number(data.ltvRatio) : null,
        loanPurpose: data.loanPurpose || null,
        status: "ACTIVE",
        remainingPrincipal: Number(data.loanAmount) || 0,
      }
    });

    // To show up in the current `Debt` query which fetches from `Debt`, we could 
    // optionally also insert a record in `Debt` with type="bank", or the dashboard 
    // needs to query BankLoan. Since the user wants it to work right now and we don't 
    // want to alter the existing GET API drastically (or we can just insert into Debt).
    // Let's insert into Debt as well to ensure dashboard compatibility for now.
    const debtRecord = await prisma.debt.create({
      data: {
        type: "bank",
        partnerName: data.bankName,
        amount: Number(data.loanAmount) || 0,
        paidAmount: 0,
        dueDate: data.termMonths ? new Date(new Date().setMonth(new Date().getMonth() + Number(data.termMonths))) : null,
        status: "UNPAID",
        description: data.loanType === "vay_the_chap" ? "Vay thế chấp tài sản" : (data.loanType === "vay_tin_chap" ? "Vay tín chấp" : "Vay vốn lưu động"),
        referenceId: data.contractNumber || `BANK-LOAN-${loan.id}`
      }
    });

    return NextResponse.json({ success: true, loan, debt: debtRecord });
  } catch (error: any) {
    console.error("[POST /api/board/finance-accounting/bank-loans] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
