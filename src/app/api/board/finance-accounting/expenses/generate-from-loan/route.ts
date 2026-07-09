import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { loanId, principalPayment, interestPayment, totalPayment, month, year } = data;

    if (!loanId || typeof totalPayment !== "number") {
      return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
    }

    const loan = await prisma.bankLoan.findUnique({
      where: { id: loanId }
    });

    if (!loan) {
      return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    }

    // Get or create category for "Trả nợ ngân hàng"
    let category = await prisma.category.findFirst({
      where: { code: "tra-no-ngan-hang", type: "expense_type" }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          code: "tra-no-ngan-hang",
          name: "Trả nợ gốc và lãi ngân hàng",
          type: "expense_type",
          isActive: true
        }
      });
    }

    // Check if expense already exists for this loan and month to avoid duplicates
    const title = `Thanh toán khoản vay ${loan.bankName} (HĐ: ${loan.contractNumber || loan.id}) - Tháng ${month}/${year}`;
    let expense = await prisma.expense.findFirst({
      where: {
        referenceType: "bank_loan",
        referenceId: loan.id,
        tenChiPhi: title,
        trangThai: "pending"
      }
    });

    if (!expense) {
      expense = await prisma.expense.create({
        data: {
          tenChiPhi: title,
          loai: category.code,
          soTien: totalPayment,
          ngayChiTra: new Date(`${year}-${String(month).padStart(2, "0")}-28T00:00:00Z`), // Default expected payment date
          trangThai: "pending",
          ghiChu: JSON.stringify({ principalPayment, interestPayment, month, year, contractNumber: loan.contractNumber }), // Store detailed breakdown
          referenceType: "bank_loan",
          referenceId: loan.id
        }
      });
    }

    return NextResponse.json({ success: true, data: expense });
  } catch (error: any) {
    console.error("[POST /api/board/finance-accounting/expenses/generate-from-loan] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
