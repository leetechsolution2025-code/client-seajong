import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    // Lấy tất cả tài khoản
    const accounts = await (prisma as any).accountingAccount.findMany({
      orderBy: { code: 'asc' }
    });

    // Lấy số dư đầu kỳ đã lưu cho tháng/năm này
    const balances = await (prisma as any).monthlyBalance.findMany({
      where: { month, year }
    });

    const balanceMap = new Map();
    balances.forEach((b: any) => {
      balanceMap.set(b.accountId, b);
    });

    // Merge data
    const data = accounts.map((acc: any) => {
      const bal = balanceMap.get(acc.id);
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        level: acc.level,
        isParent: acc.isParent,
        openingDebit: bal?.openingDebit || 0,
        openingCredit: bal?.openingCredit || 0
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching opening balances:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year, balances } = body;

    if (!month || !year || !Array.isArray(balances)) {
      return NextResponse.json({ success: false, error: "Dữ liệu không hợp lệ." }, { status: 400 });
    }

    // Dùng transaction
    const operations = balances.map((b: any) => {
      return (prisma as any).monthlyBalance.upsert({
        where: {
          accountId_month_year: {
            accountId: b.id,
            month,
            year
          }
        },
        update: {
          openingDebit: Number(b.openingDebit) || 0,
          openingCredit: Number(b.openingCredit) || 0
        },
        create: {
          accountId: b.id,
          month,
          year,
          openingDebit: Number(b.openingDebit) || 0,
          openingCredit: Number(b.openingCredit) || 0
        }
      });
    });

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, message: "Lưu số dư đầu kỳ thành công!" });
  } catch (error: any) {
    console.error("Error saving opening balances:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
