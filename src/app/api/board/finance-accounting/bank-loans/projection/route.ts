import { NextRequest, NextResponse } from "next/server";
import { calculateNextMonthLoanProjection } from "@/lib/loanProjection";

export async function GET(req: NextRequest) {
  try {
    const projectionData = await calculateNextMonthLoanProjection();

    return NextResponse.json({ 
      success: true, 
      targetMonth: projectionData.targetMonth,
      targetYear: projectionData.targetYear,
      data: projectionData.data,
      totalPrincipal: projectionData.totalPrincipal,
      totalInterest: projectionData.totalInterest,
      totalPayment: projectionData.totalPayment
    });
  } catch (error: any) {
    console.error("[GET /api/board/finance-accounting/bank-loans/projection] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
