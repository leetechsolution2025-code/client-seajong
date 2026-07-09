import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const [rawDebts, dbDebtStatuses, dbBankLoans] = await Promise.all([
      prisma.debt.findMany({
        orderBy: { createdAt: "desc" }
      }),
      prisma.category.findMany({
        where: { type: "tr_ng_th_i_c_ng_n_", isActive: true },
        orderBy: { sortOrder: "asc" }
      }),
      prisma.bankLoan.findMany()
    ]);
    
    const bankLoanMap = new Map();
    dbBankLoans.forEach(loan => {
      if (loan.contractNumber) bankLoanMap.set(loan.contractNumber, loan);
      bankLoanMap.set(loan.id, loan);
    });

    const now = new Date();

    const debts = rawDebts.map(d => {
      const amount = d.amount || 0;
      const paidAmount = d.paidAmount || 0;
      const remainingAmount = Math.max(0, amount - paidAmount);
      
      const typeLower = (d.type || "").toLowerCase();
      const isReceivable = typeLower === "receivable" || typeLower === "phai-thu";

      const dueDate = d.dueDate ? d.dueDate.toISOString().split("T")[0] : "";
      const isOverdue = d.dueDate && new Date(d.dueDate) < now && d.status !== "PAID";

      return {
        id: d.id,
        type: isReceivable ? "receivable" : ((typeLower === "bank" || typeLower === "loan" || d.partnerName?.toLowerCase().includes("bank") || d.partnerName?.toLowerCase().includes("ngân hàng")) ? "bank" : "payable"),
        partnerName: d.partnerName || "N/A",
        amount,
        paidAmount,
        remainingAmount,
        dueDate,
        isOverdue: !!isOverdue,
        status: d.status || "UNPAID",
        description: d.description || "",
        referenceId: d.referenceId || "",
        repaymentMethod: typeLower === "bank" && d.referenceId && bankLoanMap.has(d.referenceId.replace('BANK-LOAN-', '')) ? bankLoanMap.get(d.referenceId.replace('BANK-LOAN-', '')).repaymentMethod : null
      };
    });

    // Calculate dynamic summaries
    let totalReceivables = 0;
    let overdueReceivables = 0;
    let recoveredReceivables = 0;

    let totalPayables = 0;
    let overduePayables = 0;
    let paidPayables = 0;

    let totalBank = 0;
    let overdueBank = 0;
    let paidBank = 0;

    debts.forEach(d => {
      if (d.type === "receivable") {
        totalReceivables += d.remainingAmount;
        recoveredReceivables += d.paidAmount;
        if (d.isOverdue) {
          overdueReceivables += d.remainingAmount;
        }
      } else if (d.type === "payable") {
        totalPayables += d.remainingAmount;
        paidPayables += d.paidAmount;
        if (d.isOverdue) {
          overduePayables += d.remainingAmount;
        }
      } else if (d.type === "bank") {
        totalBank += d.remainingAmount;
        paidBank += d.paidAmount;
        if (d.isOverdue) {
          overdueBank += d.remainingAmount;
        }
      }
    });

    return NextResponse.json({
      success: true,
      debts,
      statuses: dbDebtStatuses.map(s => s.name),
      summary: {
        receivable: {
          total: totalReceivables,
          overdue: overdueReceivables,
          recovered: recoveredReceivables
        },
        payable: {
          total: totalPayables,
          overdue: overduePayables,
          paid: paidPayables
        },
        bank: {
          total: totalBank,
          overdue: overdueBank,
          paid: paidBank
        }
      }
    });
  } catch (error: any) {
    console.error("[GET /api/board/finance-accounting/debts] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
