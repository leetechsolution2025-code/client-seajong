import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { bankName: { contains: search } },
        { contractNumber: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const bankLoans = await (prisma as any).bankLoan.findMany({
      where,
      include: {
        disbursements: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Tính toán số liệu thống kê cho mỗi hạn mức
    const enhancedLoans = bankLoans.map((loan: any) => {
      const totalDisbursed = loan.disbursements.reduce((sum: number, d: any) => sum + d.amount, 0);
      const totalPrincipalPaid = loan.disbursements.reduce((sum: number, d: any) => sum + d.paidPrincipal, 0);
      const remainingPrincipal = totalDisbursed - totalPrincipalPaid;
      const availableLimit = loan.creditLimit - remainingPrincipal;

      return {
        ...loan,
        totalDisbursed,
        remainingPrincipal,
        availableLimit,
      };
    });

    return NextResponse.json(enhancedLoans);
  } catch (error: any) {
    console.error("GET /api/finance/bank-loans error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractNumber, bankName, loanType, creditLimit, startDate, maturityDate, collateralType, collateralValue, ltvRatio, status } = body;

    const newLoan = await (prisma as any).bankLoan.create({
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
        status: status || "ACTIVE",
      },
    });

    return NextResponse.json(newLoan);
  } catch (error: any) {
    console.error("POST /api/finance/bank-loans error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
