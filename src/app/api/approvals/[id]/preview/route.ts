import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { 
        status: 401, headers: { 'Content-Type': 'application/json' } 
      });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    const request = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) {
      return new Response(JSON.stringify({ success: false, error: "Not found" }), { 
        status: 404, headers: { 'Content-Type': 'application/json' } 
      });
    }

    const meta = request.metadata ? JSON.parse(request.metadata) : {};
    let previewData: any = { type: request.entityType, title: request.entityTitle, summary: [] };

    if (request.entityType === "marketing_monthly_execution") {
      const temp = request.entityId;
      const monthMatch = temp.match(/_m(\d+)_/);
      const month = monthMatch ? parseInt(monthMatch[1]) : meta.month;
      const planId = meta.planId || temp.split("_")[0];
      const targetTaskName = meta.taskName || temp.split("_").pop();
      
      const monthExecs = await prisma.marketingExecutionMonth.findMany({
        where: { planId, month },
        include: { task: true }
      });

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
        previewData.summary = [{ label: "Năm", value: plan.year }, { label: "Trạng thái hiện tại", value: plan.status }];
        if (meta.proposedData) {
          try {
            const proposed = meta.proposedData;
            const changes: any[] = [];
            if (proposed.goal && proposed.goal !== plan.generalPlan?.primaryGoal) {
              changes.push({ field: "Mục tiêu chính", old: plan.generalPlan?.primaryGoal || "N/A", new: proposed.goal });
            }
            const oldBudget = plan.generalPlan?.totalBudget || 0;
            const newBudget = proposed.budget ? parseFloat(proposed.budget.toString().replace(/\D/g, "")) : 0;
            if (newBudget !== oldBudget) {
              changes.push({ field: "Ngân sách", old: oldBudget.toLocaleString("vi-VN") + " đ", new: newBudget.toLocaleString("vi-VN") + " đ" });
            }
            const oldGoalLabels = plan.goals.map(g => g.label).join(", ");
            const newGoalLabels = (proposed.goalsList || []).map((g: any) => g.label).join(", ");
            if (oldGoalLabels !== newGoalLabels) {
              changes.push({ field: "Danh sách mục tiêu", old: oldGoalLabels || "Trống", new: newGoalLabels || "Trống" });
            }
            if (changes.length > 0) {
              previewData.table = {
                headers: ["Nội dung thay đổi", "Phiên bản gốc", "Phiên bản mới"],
                rows: changes.map(c => ({
                  cells: [
                    { value: c.field, style: { fontWeight: 700 } },
                    { value: c.old, style: { color: "#dc2626" } },
                    { value: c.new, style: { color: "#059669", fontWeight: 700 } }
                  ]
                }))
              };
              previewData.details = "Hệ thống phát hiện các thay đổi so với phiên bản đã ban hành trước đó. Vui lòng xem bảng đối chiếu bên dưới.";
            } else {
              previewData.details = "Không phát hiện thay đổi lớn về Mục tiêu/Ngân sách.";
            }
          } catch (e) { previewData.details = "Lỗi khi phân tích dữ liệu thay đổi."; }
        }
      }
    } else if (request.entityType === "SALARY_ADJUSTMENT") {
      const adj = await (prisma as any).salaryAdjustmentRequest.findUnique({
        where: { id: request.entityId },
        include: { employee: true }
      });
      
      if (adj) {
        const formatMoney = (val: any) => val ? Number(val).toLocaleString("vi-VN") + " đ" : "0 đ";
        
        const currAll = adj.currentAllowances ? JSON.parse(adj.currentAllowances) : {};
        const propAll = adj.proposedAllowances ? JSON.parse(adj.proposedAllowances) : {};
        
        previewData.summary = [
          { label: "Nhân viên", value: adj.employee?.fullName },
          { label: "Loại điều chỉnh", value: adj.adjustmentType === "INCREASE" ? "Tăng lương" : "Giảm lương" },
          { label: "Ngày hiệu lực", value: adj.effectiveDate ? new Date(adj.effectiveDate).toLocaleDateString("vi-VN") : "N/A" }
        ];

        const rows = [
          ["Lương cơ bản", formatMoney(adj.currentBaseSalary), formatMoney(adj.proposedBaseSalary)],
          ["Phụ cấp Ăn trưa", formatMoney(currAll.meal), formatMoney(propAll.meal)],
          ["Phụ cấp Xăng xe", formatMoney(currAll.fuel), formatMoney(propAll.fuel)],
          ["Phụ cấp Điện thoại", formatMoney(currAll.phone), formatMoney(propAll.phone)],
          ["Phụ cấp Thâm niên", formatMoney(currAll.seniority), formatMoney(propAll.seniority)],
        ];

        previewData.table = {
          headers: ["Khoản mục", "Hiện tại", "Đề xuất mới"],
          rows: rows.map(r => ({
            cells: [
              { value: r[0], style: { fontWeight: 700 } },
              { value: r[1], style: { color: "#64748b" } },
              { value: r[2], style: { color: "#059669", fontWeight: 700 } }
            ]
          }))
        };

        previewData.details = adj.reason || "Không có lý do chi tiết.";
      }
    } else if (request.entityType === "RECRUITMENT") {
      const rec = await (prisma as any).recruitmentRequest.findUnique({
        where: { id: request.entityId },
        include: { requester: { select: { name: true } } }
      });
      
      if (rec) {
        const reqs = rec.requirements ? JSON.parse(rec.requirements) : {};
        const formatSalary = (min: any, max: any) => {
          if (!min && !max) return "Thỏa thuận";
          if (!min) return `Lên đến ${Number(max).toLocaleString("vi-VN")} đ`;
          if (!max) return `Từ ${Number(min).toLocaleString("vi-VN")} đ`;
          return `${Number(min).toLocaleString("vi-VN")} - ${Number(max).toLocaleString("vi-VN")} đ`;
        };

        previewData.summary = [
          { label: "Vị trí", value: rec.position },
          { label: "Số lượng", value: rec.quantity },
          { label: "Phòng ban", value: rec.department },
          { label: "Hạn tuyển", value: rec.deadline ? new Date(rec.deadline).toLocaleDateString("vi-VN") : "N/A" }
        ];

        previewData.table = {
          headers: ["Tiêu chí", "Thông tin chi tiết"],
          rows: [
            { cells: [{ value: "Mức lương", style: { fontWeight: 700 } }, { value: formatSalary(rec.salaryMin, rec.salaryMax) }] },
            { cells: [{ value: "Hình thức", style: { fontWeight: 700 } }, { value: rec.workType || "Toàn thời gian" }] },
            { cells: [{ value: "Kinh nghiệm", style: { fontWeight: 700 } }, { value: rec.experience || "Không yêu cầu" }] },
            { cells: [{ value: "Học vấn", style: { fontWeight: 700 } }, { value: rec.education || "Không yêu cầu" }] },
            { cells: [{ value: "Kỹ năng", style: { fontWeight: 700 } }, { value: rec.skills || "N/A" }] },
          ]
        };

        // Format description more professionally
        if (rec.description) {
          const lines = rec.description.split('\n').filter((l: string) => l.trim().length > 0);
          previewData.details = `### MÔ TẢ CÔNG VIỆC & NHIỆM VỤ\n` + lines.map((l: string) => `- ${l.trim().replace(/^[•\-\*]\s*/, '')}`).join('\n');
        } else {
          previewData.details = "Không có mô tả chi tiết cho yêu cầu này.";
        }
      }
    } else if (request.entityType === "RECRUITMENT_REPORT") {
      const company = await prisma.companyInfo.findFirst();
      const candidateIds = (meta.candidates || []).map((c: any) => c.id).filter(Boolean);
      let enrichedCandidates = [];
      if (candidateIds.length > 0) {
        const fullCandidates = await (prisma.candidate.findMany as any)({
          where: { id: { in: candidateIds } },
          include: { scorecards: { include: { interviewer: true } }, request: true }
        });
        enrichedCandidates = fullCandidates.map((c: any) => {
          const scorecardCount = c.scorecards?.length || 0;
          const avgScore = scorecardCount > 0 ? Math.round(c.scorecards.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0) / scorecardCount) : 0;
          const salaryScs = (c.scorecards || []).filter((s: any) => s.salarySuggest);
          const avgSalary = salaryScs.length > 0 ? Math.round(salaryScs.reduce((sum: number, s: any) => sum + (s.salarySuggest || 0), 0) / salaryScs.length) : null;
          const hireCount = (c.scorecards || []).filter((s: any) => s.decision === 'HIRE').length;
          const majorityDecision = hireCount >= (scorecardCount / 2) ? 'HIRE' : 'REJECT';
          return { ...c, avgScore, avgSalary, scorecardCount, majorityDecision };
        });
      }
      previewData.company = company;
      previewData.candidates = enrichedCandidates;
      previewData.summary = [{ label: "Số ứng viên", value: enrichedCandidates.length }, { label: "Ngày lập", value: meta.reportDate ? new Date(meta.reportDate).toLocaleDateString('vi-VN') : "N/A" }];
      previewData.details = meta.message || "Báo cáo đề nghị tiếp nhận nhân sự sau phỏng vấn.";
      if (meta.attachments && meta.attachments.length > 0) { previewData.pdfUrl = meta.attachments[0].url; }
    } else if (request.entityType === "STATIONERY_PURCHASE" || request.entityType === "STATIONERY_PURCHASE_DIRECTOR") {
      const purchaseReq = await (prisma as any).hrSupplyRequest.findUnique({
        where: { id: request.entityId },
        include: {
          requester: true,
          department: true,
          items: {
            include: { item: true }
          }
        }
      });

      if (purchaseReq) {
        const supplierName = meta.supplierName || "—";
        const invoiceNo = meta.invoiceNo || "—";

        previewData.summary = [
          { label: "Người đề xuất", value: purchaseReq.requester?.fullName },
          { label: "Nhà cung cấp", value: supplierName },
          { label: "Số chứng từ/Hóa đơn", value: invoiceNo },
          { label: "Tổng giá trị", value: Number(purchaseReq.totalAmount).toLocaleString("vi-VN") + " đ" }
        ];

        previewData.table = {
          headers: ["Tên vật tư/dụng cụ", "Đơn vị", "Số lượng", "Đơn giá", "Thành tiền"],
          rows: purchaseReq.items.map((i: any) => ({
            cells: [
              { value: i.item.name, style: { fontWeight: 700 } },
              { value: i.item.unit || "cái" },
              { value: i.quantity.toString(), style: { textAlign: "center" } },
              { value: Number(i.unitPrice).toLocaleString("vi-VN") + " đ" },
              { value: Number(i.totalPrice).toLocaleString("vi-VN") + " đ", style: { fontWeight: 700 } }
            ]
          }))
        };

        previewData.details = purchaseReq.note || "Không có lý do/ghi chú chi tiết.";
      }
    } else if (request.entityType === "marketing_proposal") {
      if (meta.year && meta.month) {
        const plan = await prisma.masterYearlyPlan.findUnique({
          where: { year: parseInt(meta.year, 10) }
        });
        if (plan) {
          const planObj = JSON.parse(plan.planData) || {};
          const proposal = planObj.mkt_proposals?.[meta.month];
          if (proposal) {
            const mktItems: any[] = [];
            if (proposal.items) {
              Object.entries(proposal.items).forEach(([key, mainTask]: any) => {
                if (mainTask.subTasks && mainTask.subTasks.length > 0) {
                  mainTask.subTasks.forEach((sub: any) => {
                    mktItems.push({
                      name: `${mainTask.label || mainTask.name || "Hạng mục"} - ${sub.label}`,
                      proposedAmount: sub.proposedAmount,
                      description: sub.description || ""
                    });
                  });
                } else {
                  mktItems.push({
                    name: mainTask.label || mainTask.name || "Hạng mục",
                    proposedAmount: mainTask.proposedAmount || 0,
                    description: mainTask.description || ""
                  });
                }
              });
            }
            if (proposal.advReserve && proposal.advReserve > 0) {
              mktItems.push({
                name: "Ngân sách dự phòng quảng cáo (Reserve)",
                proposedAmount: proposal.advReserve,
                description: "Chi phí dự phòng phát sinh cho quảng cáo"
              });
            }

            const totalAmount = mktItems.reduce((sum, item) => sum + (item.proposedAmount || 0), 0);

            previewData.summary = [
              { label: "Đơn vị đề xuất", value: "Phòng Marketing" },
              { label: "Người đề xuất", value: proposal.proposerName || request.requestedByName || "—" },
              { label: "Ngày đề xuất", value: proposal.date || new Date(request.createdAt).toLocaleDateString("vi-VN") },
              { label: "Tổng kinh phí", value: totalAmount.toLocaleString("vi-VN") + " đ" }
            ];

            previewData.table = {
              headers: ["Hạng mục chi tiết", "Chi phí đề xuất", "Ghi chú/Mô tả"],
              rows: mktItems.map(item => ({
                cells: [
                  { value: item.name, style: { fontWeight: 700 } },
                  { value: item.proposedAmount.toLocaleString("vi-VN") + " đ", style: { color: "#059669", fontWeight: 700 } },
                  { value: item.description || "—", style: { color: "#64748b" } }
                ]
              }))
            };

            previewData.details = proposal.purpose || "Lập đề xuất chi phí Marketing.";
            if (proposal.notes) {
              previewData.details += `\n\n**Ghi chú:**\n${proposal.notes}`;
            }

            previewData.pdfUrl = meta.pdfUrl || proposal.pdfUrl;

            // Add full monthly plan metadata for rendering like the printed document
            previewData.isPlan = false;
            previewData.proposalData = proposal;
            previewData.selectedMonth = parseInt(meta.month, 10);
            previewData.selectedYear = parseInt(meta.year, 10);
            previewData.plannedBudget = planObj.mkt_monthlyBudgets?.[meta.month] || 0;
            previewData.monthlyThemes = planObj.mkt_monthlyThemes || [];
            previewData.customHolidays = planObj.mkt_customHolidays || [];
            previewData.monthlyProducts = planObj.mkt_monthlyProducts || {};
            previewData.sectionContentItems = planObj.mkt_sectionContentItems || {};
          }
        }
      }
    } else if (request.entityType === "marketing_monthly_plan") {
      if (meta.year && meta.month) {
        const plan = await prisma.masterYearlyPlan.findUnique({
          where: { year: parseInt(meta.year, 10) }
        });
        if (plan) {
          const planObj = JSON.parse(plan.planData) || {};
          const mPlan = planObj.mkt_monthly_plans?.[meta.month];
          if (mPlan) {
            const mktItems: any[] = [];
            if (mPlan.items) {
              Object.entries(mPlan.items).forEach(([key, mainTask]: any) => {
                mktItems.push({
                  id: key,
                  name: mainTask.label || mainTask.name || "Hạng mục",
                  proposedAmount: mainTask.proposedAmount || 0,
                  description: mainTask.description || "",
                  isSubTask: false
                });

                if (mainTask.subTasks && mainTask.subTasks.length > 0) {
                  mainTask.subTasks.forEach((sub: any) => {
                    mktItems.push({
                      id: sub.id,
                      name: `↳ • ${sub.label}`,
                      proposedAmount: sub.proposedAmount || 0,
                      description: sub.description || "",
                      isSubTask: true
                    });
                  });
                }
              });
            }
            if (mPlan.advReserve && mPlan.advReserve > 0) {
              mktItems.push({
                id: "reserve",
                name: "Ngân sách dự phòng quảng cáo (Reserve)",
                proposedAmount: mPlan.advReserve,
                description: "Chi phí dự phòng phát sinh cho quảng cáo",
                isSubTask: false
              });
            }

            const totalAmount = mktItems
              .filter(item => !item.isSubTask)
              .reduce((sum, item) => {
                const subSum = (mPlan.items[item.id]?.subTasks || []).reduce((s: number, sub: any) => s + (sub.proposedAmount || 0), 0);
                const amt = subSum || item.proposedAmount || 0;
                return sum + amt;
              }, 0);

            previewData.summary = [
              { label: "Đơn vị lập", value: "Phòng Marketing" },
              { label: "Người lập kế hoạch", value: mPlan.proposerName || request.requestedByName || "—" },
              { label: "Ngày lập kế hoạch", value: mPlan.date || new Date(request.createdAt).toLocaleDateString("vi-VN") },
              { label: "Kinh phí dự kiến", value: totalAmount.toLocaleString("vi-VN") + " đ" }
            ];

            previewData.table = {
              headers: ["Hạng mục chi tiết", "Kinh phí dự kiến", "Ghi chú/Mô tả"],
              rows: mktItems.map(item => ({
                cells: [
                  { 
                    value: item.name, 
                    style: { 
                      fontWeight: item.isSubTask ? 400 : 700, 
                      paddingLeft: item.isSubTask ? "20px" : "8px",
                      color: item.isSubTask ? "#4b5563" : "#111827"
                    } 
                  },
                  { 
                    value: item.proposedAmount > 0 
                      ? item.proposedAmount.toLocaleString("vi-VN") + " đ" 
                      : (item.isSubTask ? "—" : "0 đ"), 
                    style: { 
                      color: item.proposedAmount > 0 ? "#2563eb" : "#4b5563", 
                      fontWeight: item.isSubTask ? 400 : 700 
                    } 
                  },
                  { value: item.description || "—", style: { color: "#6b7280" } }
                ]
              }))
            };

            const monthInt = parseInt(meta.month, 10);
            const theme = (planObj.mkt_monthlyThemes || []).find((t: any) => t.month === monthInt || (!t.month && monthInt === 6)) || {};
            previewData.details = `Kế hoạch Marketing tháng ${meta.month}/${meta.year}.\n\n` + 
              `**Chủ đề tháng:** ${theme.topic || "Chưa thiết lập"}\n` +
              `**Nội dung cốt lõi:** ${theme.content || "Chưa thiết lập"}`;
              
            if (mPlan.notes) {
              previewData.details += `\n\n**Ghi chú:**\n${mPlan.notes}`;
            }

            previewData.pdfUrl = meta.pdfUrl || mPlan.pdfUrl;

            // Add full monthly plan metadata for rendering like the printed document
            previewData.isPlan = true;
            previewData.proposalData = mPlan;
            previewData.selectedMonth = monthInt;
            previewData.selectedYear = meta.year;
            previewData.plannedBudget = planObj.mkt_monthlyBudgets?.[meta.month] || 0;
            previewData.monthlyThemes = planObj.mkt_monthlyThemes || [];
            previewData.customHolidays = planObj.mkt_customHolidays || [];
            previewData.monthlyProducts = planObj.mkt_monthlyProducts || {};
            previewData.sectionContentItems = planObj.mkt_sectionContentItems || {};
          }
        }
      }
    } else if (request.entityType === "master_yearly_plan") {
      if (meta.year) {
        const plan = await prisma.masterYearlyPlan.findUnique({
          where: { year: parseInt(meta.year, 10) }
        });
        if (plan) {
          const planObj = JSON.parse(plan.planData) || {};
          const valAgent = Number(planObj.revenueAgent) || 0;
          const valAgentDev = Number(planObj.revenueAgentDev) || 0;
          const valTraditional = Number(planObj.traditional) || Number(planObj.revenueTraditional) || 0;
          const valEcommerce = Number(planObj.ecommerce) || Number(planObj.revenueEcommerce) || 0;
          const totalRevenue = valAgent + valAgentDev + valTraditional + valEcommerce;
          
          const isCalculateByRevenue = planObj.isCalculateByRevenue ?? false;
          const valMarketingCost = isCalculateByRevenue
            ? Math.round(totalRevenue * (Number(planObj.costMarketingPercent) || 0) / 100)
            : (Number(planObj.costMarketing) || 0);

          previewData.summary = [
            { label: "Năm kế hoạch", value: String(plan.year) },
            { label: "Doanh thu mục tiêu", value: totalRevenue.toLocaleString("vi-VN") + " đ" },
            { label: "Ngân sách Marketing", value: valMarketingCost.toLocaleString("vi-VN") + " đ" },
            { label: "Người đề xuất", value: request.requestedByName || "—" }
          ];

          previewData.details = `Kế hoạch Marketing tổng thể và ngân sách năm ${plan.year} đang được gửi trình duyệt.`;
          previewData.pdfUrl = meta.pdfUrl;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, data: previewData }), { 
      status: 200, headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message || "Internal Server Error" }), { 
      status: 500, headers: { 'Content-Type': 'application/json' } 
    });
  }
}
