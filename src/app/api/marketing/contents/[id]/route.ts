import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/marketing/contents/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.channel !== undefined) data.channel = body.channel;
    if (body.format !== undefined) data.format = body.format;
    if (body.targetMonth !== undefined) data.targetMonth = body.targetMonth;
    if (body.budget !== undefined) data.budget = body.budget;
    if (body.kpi !== undefined) data.kpi = body.kpi;
    if (body.assignedTeam !== undefined) data.assignedTeam = body.assignedTeam;
    if (body.notes !== undefined) data.notes = body.notes;

    const content = await prisma.marketingContent.update({ where: { id }, data });
    return NextResponse.json(content);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi cập nhật" }, { status: 500 });
  }
}

// DELETE /api/marketing/contents/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.marketingContent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi xoá" }, { status: 500 });
  }
}
