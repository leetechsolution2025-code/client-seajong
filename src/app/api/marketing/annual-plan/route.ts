import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketing/annual-plan?year=2026
export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year");
  try {
    const plans = await prisma.marketingAnnualPlan.findMany({
      where: year ? { year: parseInt(year) } : undefined,
      include: {
        themes: {
          include: { contents: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { year: "desc" },
    });
    return NextResponse.json(plans);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/marketing/annual-plan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plan = await prisma.marketingAnnualPlan.create({
      data: {
        year: body.year,
        title: body.title,
        objectives: body.objectives || "",
        budget: body.budget || 0,
        targetSegment: body.targetSegment || null,
        platforms: JSON.stringify(body.platforms || []),
        jobOverview: JSON.stringify(body.jobOverview || []),
        status: "draft",
        createdById: body.createdById || "unknown",
        createdByName: body.createdByName || "",
        clientId: body.clientId || null,
      },
      include: { themes: { include: { contents: true } } },
    });
    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi tạo kế hoạch" }, { status: 500 });
  }
}
