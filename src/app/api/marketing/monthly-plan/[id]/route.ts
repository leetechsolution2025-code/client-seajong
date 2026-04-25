import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketing/monthly-plan/[id]
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const plan = await prisma.marketingMonthlyPlan.findUnique({
      where: { id },
      include: {
        tasks: {
          include: { content: { include: { theme: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!plan) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json(plan);
  } catch (err) { return NextResponse.json({ error: "Lỗi server" }, { status: 500 }); }
}

// PATCH /api/marketing/monthly-plan/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.summary !== undefined) data.summary = body.summary;
    if (body.team !== undefined) data.team = body.team;
    if (body.status !== undefined) data.status = body.status;
    if (body.rejectedReason !== undefined) data.rejectedReason = body.rejectedReason;
    if (body.reviewedById !== undefined) { data.reviewedById = body.reviewedById; data.reviewedAt = new Date(); }

    const plan = await prisma.marketingMonthlyPlan.update({
      where: { id }, data,
      include: { tasks: { include: { content: { include: { theme: true } } }, orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json(plan);
  } catch (err) { return NextResponse.json({ error: "Lỗi cập nhật" }, { status: 500 }); }
}

// DELETE /api/marketing/monthly-plan/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.marketingMonthlyPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) { return NextResponse.json({ error: "Lỗi xoá" }, { status: 500 }); }
}
