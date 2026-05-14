import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketing/monthly-plan?year=2026&month=4&employeeId=xxx
export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year");
  const month = req.nextUrl.searchParams.get("month");
  const employeeId = req.nextUrl.searchParams.get("employeeId");
  try {
    const isAggregated = req.nextUrl.searchParams.get("aggregated") === "true";

    const where: Record<string, any> = {};
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);
    if (employeeId && !isAggregated) where.employeeId = employeeId;

    let plans = await prisma.marketingMonthlyPlan.findMany({
      where,
      include: {
        tasks: {
          include: { content: { include: { theme: { include: { plan: true } } } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    if (isAggregated && plans.length > 0) {
      // Exclude empty draft plans from aggregation to avoid mess
      const activePlans = plans.filter(p => p.tasks.length > 0 || p.status !== "draft");
      const targetPlans = activePlans.length > 0 ? activePlans : plans;

      const allTasks = targetPlans.flatMap(p => p.tasks);
      const consolidatedPlan = {
        ...targetPlans[0],
        id: "aggregated",
        employeeId: "aggregated",
        employeeName: "TỔNG HỢP ĐỘI NGŨ",
        tasks: allTasks,
        constituentIds: targetPlans.map(p => p.id),
        status: targetPlans.every(p => p.status === "approved") ? "approved" : "submitted"
      };
      return NextResponse.json([consolidatedPlan]);
    }

    return NextResponse.json(plans);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/marketing/monthly-plan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plan = await prisma.marketingMonthlyPlan.create({
      data: {
        year: body.year,
        month: body.month,
        employeeId: body.employeeId,
        employeeName: body.employeeName,
        team: body.team || null,
        summary: body.summary || null,
        status: "draft",
        clientId: body.clientId || null,
      },
      include: { tasks: true },
    });
    return NextResponse.json(plan, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Đã có kế hoạch cho tháng này" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Lỗi tạo kế hoạch tháng" }, { status: 500 });
  }
}
