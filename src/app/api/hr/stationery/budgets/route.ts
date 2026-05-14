import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Fetch everything separately for maximum reliability
    const [departments, allBudgets, requests] = await Promise.all([
      prisma.departmentCategory.findMany({
        where: { isActive: true },
        select: { id: true, nameVi: true, code: true }
      }),
      (prisma as any).hrStationeryDepartmentBudget.findMany(),
      (prisma as any).hrSupplyRequest.findMany({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { notIn: ["REJECTED"] }
        },
        select: { departmentId: true, totalAmount: true }
      })
    ]);

    const budgetMap: Record<string, any> = {};
    allBudgets.forEach((b: any) => { budgetMap[b.departmentId] = b; });

    const spentMap: Record<string, number> = {};
    requests.forEach((r: any) => {
      spentMap[r.departmentId] = (spentMap[r.departmentId] || 0) + r.totalAmount;
    });

    // Combine them
    const result = departments.map((d: any) => {
      const b = budgetMap[d.id];
      return {
        id: b?.id || null,
        departmentId: d.id,
        departmentName: d.nameVi,
        departmentCode: d.code,
        monthlyBudget: b?.monthlyBudget || 0,
        spentAmount: spentMap[d.id] || 0,
      };
    }).sort((a: any, b: any) => a.departmentName.localeCompare(b.departmentName));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET budgets error:", error);
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { departmentId, monthlyBudget } = body;

    if (!departmentId) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
    }

    const budget = await (prisma as any).hrStationeryDepartmentBudget.upsert({
      where: { departmentId },
      update: { monthlyBudget: Number(monthlyBudget) },
      create: {
        departmentId,
        monthlyBudget: Number(monthlyBudget),
      }
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("POST budget error:", error);
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
  }
}
