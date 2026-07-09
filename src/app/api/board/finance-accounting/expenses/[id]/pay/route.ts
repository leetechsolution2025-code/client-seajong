import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const { ngayChiTra, nguoiChiTra } = data;

    if (!ngayChiTra) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (id.startsWith("virtual-interest-")) {
      // Create real expense on the fly
      const parts = id.split("-"); // virtual-interest-loanId-year-month
      const loanId = parts[2];
      const year = parts[3];
      const month = parts[4];
      
      const loan = await prisma.bankLoan.findUnique({ where: { id: loanId } });
      if (!loan) return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
      
      const monthlyInterest = ((loan.loanAmount || 0) * (loan.interestRate || 0)) / 100 / 12;
      
      const category = await prisma.category.findFirst({ where: { code: "interest", type: "expense_type" } });
      const catCode = category ? category.code : "Khác";

      const newExpense = await prisma.expense.create({
        data: {
          tenChiPhi: `Thanh toán khoản vay ${loan.bankName} (Lãi) - Tháng ${month}/${year}`,
          loai: catCode,
          soTien: Math.round(monthlyInterest),
          ngayChiTra: new Date(ngayChiTra),
          nguoiChiTra: nguoiChiTra || "Hệ thống tự động",
          trangThai: "paid",
          ghiChu: JSON.stringify({ principalPayment: 0, interestPayment: Math.round(monthlyInterest), month, year }),
          referenceType: "bank_loan",
          referenceId: loan.id
        }
      });
      return NextResponse.json({ success: true, data: newExpense });
    }

    const expense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    if (expense.trangThai === "paid") {
      return NextResponse.json({ success: false, error: "Expense is already paid" }, { status: 400 });
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        ngayChiTra: new Date(ngayChiTra),
        nguoiChiTra: nguoiChiTra || expense.nguoiChiTra,
        trangThai: "paid"
      }
    });

    // If this expense is linked to a bank loan, update the Debt record
    if (expense.referenceType === "bank_loan" && expense.referenceId) {
      const loan = await prisma.bankLoan.findUnique({
        where: { id: expense.referenceId }
      });
      
      if (loan) {
        // Find the Debt record associated with this BankLoan
        // We look for Debt with type "bank" and referenceId containing the loan contract or ID
        const debt = await prisma.debt.findFirst({
          where: {
            type: "bank",
            OR: [
              { referenceId: loan.contractNumber || `BANK-LOAN-${loan.id}` },
              { partnerName: loan.bankName }
            ]
          }
        });

        if (debt) {
          // Extract principal payment from ghiChu (we stored it as JSON)
          let principalPayment = expense.soTien; // default to full if not found
          try {
            if (expense.ghiChu) {
              const parsed = JSON.parse(expense.ghiChu);
              if (parsed.principalPayment) {
                principalPayment = parsed.principalPayment;
              }
            }
          } catch (e) {
            // ignore JSON parse error
          }

          // Increase paidAmount
          await prisma.debt.update({
            where: { id: debt.id },
            data: {
              paidAmount: debt.paidAmount + principalPayment
            }
          });
          
          // Decrease remainingPrincipal in BankLoan as well
          await prisma.bankLoan.update({
            where: { id: loan.id },
            data: {
              remainingPrincipal: Math.max(0, (loan.remainingPrincipal || loan.loanAmount) - principalPayment)
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: updatedExpense });
  } catch (error: any) {
    console.error("[PUT /api/board/finance-accounting/expenses/[id]/pay] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
