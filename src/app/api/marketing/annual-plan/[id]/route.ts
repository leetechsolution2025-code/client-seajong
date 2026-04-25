import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketing/annual-plan/[id]
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const plan = await prisma.marketingAnnualPlan.findUnique({
      where: { id },
      include: {
        themes: {
          include: { contents: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!plan) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json(plan);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// PATCH /api/marketing/annual-plan/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.objectives !== undefined) data.objectives = body.objectives;
    if (body.budget !== undefined) data.budget = body.budget;
    if (body.targetSegment !== undefined) data.targetSegment = body.targetSegment;
    if (body.platforms !== undefined) data.platforms = JSON.stringify(body.platforms);
    if (body.jobOverview !== undefined) data.jobOverview = JSON.stringify(body.jobOverview);
    if (body.status !== undefined) data.status = body.status;
    if (body.rejectedReason !== undefined) data.rejectedReason = body.rejectedReason;
    if (body.approvedById !== undefined) {
      data.approvedById = body.approvedById;
      data.approvedAt = new Date();
    }

    const plan = await prisma.marketingAnnualPlan.update({
      where: { id },
      data,
      include: {
        themes: {
          include: { contents: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    return NextResponse.json(plan);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi cập nhật" }, { status: 500 });
  }
}

// DELETE /api/marketing/annual-plan/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.marketingAnnualPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi xoá" }, { status: 500 });
  }
}
