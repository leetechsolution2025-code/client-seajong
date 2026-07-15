import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const sourceModule = searchParams.get("sourceModule");
    const month = searchParams.get("month");
    
    const where: any = {};
    if (search) {
      where.OR = [
        { referenceCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (sourceModule) {
      where.sourceModule = sourceModule;
    }
    if (month) {
      const [year, m] = month.split('-');
      const startDate = new Date(Number(year), Number(m) - 1, 1);
      const endDate = new Date(Number(year), Number(m), 1);
      where.entryDate = {
        gte: startDate,
        lt: endDate
      };
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { entryDate: 'desc' },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error("Error fetching journal entries:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { entryDate, description, referenceCode, lines } = data;

    // lines: [{ accountId, type: 'DEBIT'|'CREDIT', amount }]
    
    // Validate balance
    const totalDebit = lines.filter((l: any) => l.type === 'DEBIT').reduce((sum: number, l: any) => sum + Number(l.amount), 0);
    const totalCredit = lines.filter((l: any) => l.type === 'CREDIT').reduce((sum: number, l: any) => sum + Number(l.amount), 0);
    
    if (totalDebit !== totalCredit) {
      return NextResponse.json({ error: "Tổng nợ và tổng có không cân bằng" }, { status: 400 });
    }

    if (totalDebit === 0) {
      return NextResponse.json({ error: "Vui lòng nhập ít nhất một dòng hạch toán" }, { status: 400 });
    }

    const entry = await prisma.journalEntry.create({
      data: {
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        description,
        referenceCode,
        sourceModule: "MANUAL",
        totalAmount: totalDebit,
        lines: {
          create: lines.map((l: any) => ({
            accountId: l.accountId,
            type: l.type,
            amount: Number(l.amount),
            description: l.description || ""
          }))
        }
      }
    });

    // Update account balances
    for (const line of lines) {
      const account = await prisma.accountingAccount.findUnique({ where: { id: line.accountId } });
      if (!account) continue;

      let balanceChange = 0;
      // Asset & Expense increase with Debit. Liability, Equity, Revenue increase with Credit.
      if (['ASSET', 'EXPENSE'].includes(account.type)) {
        balanceChange = line.type === 'DEBIT' ? Number(line.amount) : -Number(line.amount);
      } else {
        balanceChange = line.type === 'CREDIT' ? Number(line.amount) : -Number(line.amount);
      }

      await prisma.accountingAccount.update({
        where: { id: line.accountId },
        data: { balance: { increment: balanceChange } }
      });
    }

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error("Error creating journal entry:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
