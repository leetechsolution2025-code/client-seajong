import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "RECEIVABLE";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const daysFilter = searchParams.get("daysFilter") || "ALL";

    console.log(`API V2 (RAW) Fetching debts for type: ${type}, filter: ${daysFilter}`);

    // Sử dụng Raw Query để bypass lỗi "Unknown argument type" của Prisma Client
    let query = `SELECT * FROM "Debt" WHERE "type" = $1`;
    let params: any[] = [type];
    let paramIndex = 2;

    if (status) {
      query += ` AND "status" = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      query += ` AND ("partnerName" LIKE $${paramIndex} OR "referenceId" LIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const now = new Date();
    if (daysFilter === "OVERDUE") {
      query += ` AND "dueDate" < $${paramIndex++} AND "status" != 'PAID'`;
      params.push(now);
    } else if (daysFilter === "30_DAYS") {
      query += ` AND "dueDate" >= $${paramIndex} AND "dueDate" <= $${paramIndex + 1}`;
      params.push(now, addDays(now, 30));
      paramIndex += 2;
    } else if (daysFilter === "30_60_DAYS") {
      query += ` AND "dueDate" > $${paramIndex} AND "dueDate" <= $${paramIndex + 1}`;
      params.push(addDays(now, 30), addDays(now, 60));
      paramIndex += 2;
    } else if (daysFilter === "OVER_60_DAYS") {
      query += ` AND "dueDate" > $${paramIndex++}`;
      params.push(addDays(now, 60));
    }

    query += ` ORDER BY "dueDate" ASC`;

    const debts = await prisma.$queryRawUnsafe(query, ...params) as any[];

    // Tính toán stats (cũng dùng Raw Query để đồng bộ)
    const statsQuery = `SELECT * FROM "Debt" WHERE "type" = $1`;
    const allDebtsOfType = await prisma.$queryRawUnsafe(statsQuery, type) as any[];

    const totalAmount = allDebtsOfType.reduce((s: number, d: any) => s + (d.amount || 0), 0);
    const totalPaid = allDebtsOfType.reduce((s: number, d: any) => s + (d.paidAmount || 0), 0);
    const recoveryRate = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

    const upcomingCount = allDebtsOfType.filter((d: any) => 
      d.status !== "PAID" && d.dueDate && new Date(d.dueDate) >= now && new Date(d.dueDate) <= addDays(now, 15)
    ).length;

    const stats = {
      totalAmount,
      totalPaid,
      recoveryRate,
      upcomingCount,
      avgDays: type === "RECEIVABLE" ? 12 : 45,
      overdueCount: allDebtsOfType.filter((d: any) => d.status !== "PAID" && d.dueDate && new Date(d.dueDate) < now).length,
      countByFilter: {
        ALL: allDebtsOfType.length,
        OVERDUE: allDebtsOfType.filter((d: any) => d.status !== "PAID" && d.dueDate && new Date(d.dueDate) < now).length,
        DAYS_30: allDebtsOfType.filter((d: any) => d.dueDate && new Date(d.dueDate) >= now && new Date(d.dueDate) <= addDays(now, 30)).length,
        DAYS_30_60: allDebtsOfType.filter((d: any) => d.dueDate && new Date(d.dueDate) > addDays(now, 30) && new Date(d.dueDate) <= addDays(now, 60)).length,
        OVER_60: allDebtsOfType.filter((d: any) => d.dueDate && new Date(d.dueDate) > addDays(now, 60)).length,
      }
    };

    return NextResponse.json({ debts, stats });
  } catch (error: any) {
    console.error("Fetch debts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, partnerName, amount, paidAmount, dueDate, interestRate, description, referenceId, status } = body;

    const debt = await (prisma.debt as any).create({
      data: {
        type,
        partnerName,
        amount: Number(amount) || 0,
        paidAmount: Number(paidAmount) || 0,
        dueDate: dueDate ? new Date(dueDate) : null,
        interestRate: interestRate ? Number(interestRate) : null,
        description,
        referenceId,
        status: status || "UNPAID",
      }
    });

    return NextResponse.json(debt);
  } catch (error: any) {
    console.error("Create debt error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const body = await request.json();
    const { type, partnerName, amount, paidAmount, dueDate, interestRate, description, referenceId, status } = body;

    const debt = await (prisma.debt as any).update({
      where: { id },
      data: {
        type,
        partnerName,
        amount: Number(amount) || 0,
        paidAmount: Number(paidAmount) || 0,
        dueDate: dueDate ? new Date(dueDate) : null,
        interestRate: interestRate ? Number(interestRate) : null,
        description,
        referenceId,
        status: status || "UNPAID",
      }
    });

    return NextResponse.json(debt);
  } catch (error: any) {
    console.error("Update debt error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "Debt" WHERE "id" = $1`, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete debt error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
