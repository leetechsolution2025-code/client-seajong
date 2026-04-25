import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketing/contents?themeId=xxx
export async function GET(req: NextRequest) {
  const themeId = req.nextUrl.searchParams.get("themeId");
  const planId = req.nextUrl.searchParams.get("planId");
  try {
    if (themeId) {
      const contents = await prisma.marketingContent.findMany({
        where: { themeId },
        orderBy: { sortOrder: "asc" },
      });
      return NextResponse.json(contents);
    }
    if (planId) {
      // Lấy tất cả contents thuộc 1 plan (qua theme)
      const themes = await prisma.marketingTheme.findMany({
        where: { planId },
        include: { contents: { orderBy: { sortOrder: "asc" } } },
      });
      const contents = themes.flatMap(t => t.contents.map(c => ({ ...c, themeTitle: t.title, themeColor: t.color })));
      return NextResponse.json(contents);
    }
    return NextResponse.json({ error: "themeId hoặc planId required" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/marketing/contents
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content = await prisma.marketingContent.create({
      data: {
        themeId: body.themeId,
        title: body.title,
        channel: body.channel || null,
        format: body.format || null,
        targetMonth: body.targetMonth || 1,
        budget: body.budget || 0,
        kpi: body.kpi || null,
        assignedTeam: body.assignedTeam || "all",
        notes: body.notes || null,
        sortOrder: body.sortOrder || 0,
      },
    });
    return NextResponse.json(content, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi tạo nội dung" }, { status: 500 });
  }
}
