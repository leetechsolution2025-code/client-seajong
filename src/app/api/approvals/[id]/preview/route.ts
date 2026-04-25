import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const request = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const meta = request.metadata ? JSON.parse(request.metadata) : {};
    let previewData: any = { type: request.entityType, title: request.entityTitle, summary: [] };

    if (request.entityType === "marketing_monthly_execution") {
      // Parse entityId: planId_m{month}_taskName
      // Example: entityId = clux_m4_Media
      const temp = request.entityId;
      const monthMatch = temp.match(/_m(\d+)_/);
      const month = monthMatch ? parseInt(monthMatch[1]) : meta.month;
      
      const planId = meta.planId || temp.split("_")[0];
      const targetTaskName = meta.taskName || temp.split("_").pop();
      
      const monthExecs = await prisma.marketingExecutionMonth.findMany({
        where: { planId, month },
        include: { task: true }
      });

      // Filter to the specific task
      let monthExec = monthExecs.find(t => t.task?.name === targetTaskName);
      if (!monthExec && monthExecs.length > 0) monthExec = monthExecs[0];

      let flatTasks: any[] = [];
      if (monthExec) {
        const groups = await prisma.marketingExecutionGroup.findMany({
          where: { monthId: monthExec.id },
          include: { 
             tasks: { 
               orderBy: { orderIndex: 'asc' },
               include: { children: { orderBy: { orderIndex: 'asc' } } }
             } 
          },
          orderBy: { orderIndex: 'asc' }
        });
        
        let groupIndex = 0;
        for (const g of groups) {
           groupIndex++;
           flatTasks.push({ name: g.name.toUpperCase(), isHeader: true, stt: groupIndex.toString() });
           for (const t of g.tasks.filter(x => !x.parentId)) {
              flatTasks.push({ ...t, isChild: false });
              for (const c of t.children) flatTasks.push({ ...c, name: c.name, isChild: true });
           }
        }
      }

      previewData.summary = [];
      
      previewData.rawTasks = flatTasks;
    } else if (request.entityType === "expense") {
      const expense = await prisma.expense.findUnique({ where: { id: request.entityId } });
      if (expense) {
        previewData.summary = [
          { label: "Số tiền", value: Number(expense.soTien).toLocaleString("vi-VN") + " đ" },
          { label: "Phân loại", value: expense.loai || "Khác" }
        ];
        previewData.details = expense.ghiChu;
      }
    } else if (request.entityType === "marketing_yearly_plan") {
      const plan = await prisma.marketingYearlyPlan.findUnique({
        where: { id: request.entityId },
        include: {
          generalPlan: true,
          goals: { orderBy: { sortOrder: "asc" } },
          tasks: { orderBy: { sortOrder: "asc" } }
        }
      });

      if (plan) {
        previewData.summary = [
          { label: "Năm", value: plan.year },
          { label: "Trạng thái hiện tại", value: plan.status }
        ];

        if (meta.proposedData) {
          try {
            const proposed = meta.proposedData;
            const changes: any[] = [];

            // Compare General Plan
            if (proposed.goal && proposed.goal !== plan.generalPlan?.primaryGoal) {
              changes.push({ field: "Mục tiêu chính", old: plan.generalPlan?.primaryGoal || "N/A", new: proposed.goal });
            }
            const oldBudget = plan.generalPlan?.totalBudget || 0;
            const newBudget = proposed.budget ? parseFloat(proposed.budget.toString().replace(/\D/g, "")) : 0;
            if (newBudget !== oldBudget) {
              changes.push({ field: "Ngân sách", old: oldBudget.toLocaleString("vi-VN") + " đ", new: newBudget.toLocaleString("vi-VN") + " đ" });
            }

            // Simple Goals comparison
            const oldGoalLabels = plan.goals.map(g => g.label).join(", ");
            const newGoalLabels = (proposed.goalsList || []).map((g: any) => g.label).join(", ");
            if (oldGoalLabels !== newGoalLabels) {
              changes.push({ field: "Danh sách mục tiêu", old: oldGoalLabels || "Trống", new: newGoalLabels || "Trống" });
            }

            if (changes.length > 0) {
              previewData.table = {
                headers: ["Nội dung thay đổi", "Phiên bản gốc", "Phiên bản mới"],
                rows: changes.map(c => [
                  { value: c.field, style: { fontWeight: 700 } },
                  { value: c.old, style: { color: "#dc2626" } },
                  { value: c.new, style: { color: "#059669", fontWeight: 700 } }
                ])
              };
              previewData.details = "Hệ thống phát hiện các thay đổi so với phiên bản đã ban hành trước đó. Vui lòng xem bảng đối chiếu bên dưới.";
            } else {
              previewData.details = "Không phát hiện thay đổi lớn về Mục tiêu/Ngân sách. Có thể là thay đổi chi tiết trong các hạng mục triển khai.";
            }
          } catch (e) {
            previewData.details = "Lỗi khi phân tích dữ liệu thay đổi.";
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: previewData });
  } catch (e: any) {
    console.error("[GET /api/approvals/[id]/preview]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
