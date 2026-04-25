import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/marketing/themes/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.startMonth !== undefined) data.startMonth = body.startMonth;
    if (body.endMonth !== undefined) data.endMonth = body.endMonth;
    if (body.budget !== undefined) data.budget = body.budget;
    if (body.assignedTeam !== undefined) data.assignedTeam = body.assignedTeam;
    if (body.color !== undefined) data.color = body.color;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    const theme = await prisma.marketingTheme.update({
      where: { id },
      data,
      include: { contents: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json(theme);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi cập nhật" }, { status: 500 });
  }
}

// DELETE /api/marketing/themes/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.marketingTheme.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi xoá" }, { status: 500 });
  }
}
