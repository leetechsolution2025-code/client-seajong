import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch raw loans from the Debt table
    const rawLoans = await prisma.debt.findMany({
      where: {
        OR: [
          { type: "LOAN" },
          { type: "loan" },
          { type: "vay" }
        ]
      },
      orderBy: { createdAt: "desc" }
    });

    const loans = rawLoans.map(loan => {
      const amount = loan.amount || 0;
      const paidAmount = loan.paidAmount || 0;
      const remainingAmount = Math.max(0, amount - paidAmount);
      
      const interestRate = loan.interestRate || 0;
      // Monthly interest: (remainingAmount * interestRate) / 100 / 12
      const monthlyInterest = Math.round((remainingAmount * interestRate) / 100 / 12);
      
      const startDate = loan.createdAt ? loan.createdAt.toISOString().split("T")[0] : "";
      const dueDate = loan.dueDate ? loan.dueDate.toISOString().split("T")[0] : "";

      // Term calculation in months
      let termMonths = 0;
      if (loan.createdAt && loan.dueDate) {
        termMonths = (loan.dueDate.getFullYear() - loan.createdAt.getFullYear()) * 12 + (loan.dueDate.getMonth() - loan.createdAt.getMonth());
      }

      return {
        id: loan.id,
        partnerName: loan.partnerName,
        amount,
        paidAmount,
        remainingAmount,
        interestRate,
        monthlyInterest,
        startDate,
        dueDate,
        termMonths,
        status: loan.status || "UNPAID",
        description: loan.description || "",
        referenceId: loan.referenceId || ""
      };
    });

    // Calculate summaries
    let totalPrincipal = 0;
    let remainingBalance = 0;
    let estimatedMonthlyInterest = 0;

    loans.forEach(l => {
      totalPrincipal += l.amount;
      remainingBalance += l.remainingAmount;
      estimatedMonthlyInterest += l.monthlyInterest;
    });

    return NextResponse.json({
      success: true,
      loans,
      summary: {
        totalPrincipal,
        remainingBalance,
        estimatedMonthlyInterest,
        count: loans.length
      }
    });
  } catch (error: any) {
    console.error("[GET /api/board/finance-accounting/loans] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
