import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketing/themes?planId=xxx
export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("planId");
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });
  try {
    const themes = await prisma.marketingTheme.findMany({
      where: { planId },
      include: { contents: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(themes);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/marketing/themes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const theme = await prisma.marketingTheme.create({
      data: {
        planId: body.planId,
        title: body.title,
        description: body.description || null,
        startMonth: body.startMonth || 1,
        endMonth: body.endMonth || 3,
        budget: body.budget || 0,
        assignedTeam: body.assignedTeam || "all",
        color: body.color || "#8b5cf6",
        sortOrder: body.sortOrder || 0,
      },
      include: { contents: true },
    });
    return NextResponse.json(theme, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi tạo chủ đề" }, { status: 500 });
  }
}
