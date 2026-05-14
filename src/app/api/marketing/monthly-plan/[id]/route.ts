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
    // 1. Tìm kế hoạch để lấy thông tin (year, month, employeeId) trước khi xoá
    const plan = await prisma.marketingMonthlyPlan.findUnique({
      where: { id }
    });

    if (!plan) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    // 2. Xoá MarketingMonthlyPlan (tự động xoá Tasks và TaskComments nhờ Cascade)
    await prisma.marketingMonthlyPlan.delete({ where: { id } });

    // 3. Xoá ApprovalRequests liên quan (tin nhắn, thảo luận ở TT Phê duyệt)
    try {
      const monthStr = plan.month.toString();
      const requests = await prisma.approvalRequest.findMany({
        where: { 
          entityType: "marketing_monthly_execution",
          entityId: { contains: `-m${monthStr}-` } 
        }
      });

      for (const req of requests) {
        let planId = "";
        let taskName = "";
        
        if (req.metadata) {
          const meta = JSON.parse(req.metadata);
          if (meta.year !== plan.year || meta.month !== plan.month) continue;
          planId = meta.planId;
          taskName = meta.taskName;
        } else {
          // Fallback parsing from entityId: {planId}-m{month}-{taskName}
          const parts = req.entityId.split("-");
          if (parts.length >= 3) {
            planId = parts.slice(0, parts.length - 2).join("-");
            taskName = parts[parts.length - 1];
          }
        }

        if (!planId || !taskName) continue;

        const normalizedTaskName = taskName.replace(/\s+/g, "").toUpperCase();
        
        const yearlyTasks = await prisma.marketingYearlyTask.findMany({
          where: { planId }
        });
        const yearlyTask = yearlyTasks.find(t => t.name.replace(/\s+/g, "").toUpperCase() === normalizedTaskName);
        
        const yearlyPlan = await prisma.marketingYearlyPlan.findUnique({ where: { id: planId } });

        const picId = yearlyTask?.assigneeId || yearlyPlan?.authorId;

        // Nếu ApprovalRequest này thuộc về employee của MonthlyPlan vừa bị xoá
        if (picId === plan.employeeId) {
          await prisma.approvalRequest.delete({ where: { id: req.id } });
        }
      }
    } catch (cleanupErr) {
      console.error("[Cleanup ApprovalRequest Error]", cleanupErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) { 
    return NextResponse.json({ error: "Lỗi xoá" }, { status: 500 }); 
  }
}
