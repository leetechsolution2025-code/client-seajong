import { prisma } from "@/lib/prisma";

/**
 * Helper to save the monthly execution roadmap (Step 3)
 */
async function saveMonthlyExecutionRoadmap(tx: any, planId: string, monthlyPlans: any, taskIdMap?: Map<string, string>) {
  // 1. Clear old execution months
  await tx.marketingExecutionMonth.deleteMany({ where: { planId } });

  // 2. Iterate over: Record<taskId, Record<month, items[]>>
  for (const [oldTaskId, monthsData] of Object.entries(monthlyPlans || {})) {
    if (!monthsData) continue;
    
    // Resolve the current taskId (it might have changed if tasks were recreated)
    const currentTaskId = taskIdMap ? taskIdMap.get(oldTaskId) : oldTaskId;
    if (!currentTaskId) continue;

    for (const [monthStr, items] of Object.entries(monthsData as any)) {
      const monthInt = parseInt(monthStr);
      if (!Array.isArray(items) || items.length === 0) continue;

      const em = await tx.marketingExecutionMonth.create({
        data: {
          planId: planId,
          taskId: currentTaskId,
          month: monthInt,
        }
      });

      let currentGroup: any = null;
      let groupOrder = 0;
      let detailOrder = 0;
      const detailIDMap = new Map<string, string>(); // Map frontend ID -> new DB ID

      for (const item of items) {
        if (item.isHeader || item.isCustomHeader) {
          currentGroup = await tx.marketingExecutionGroup.create({
            data: {
              monthId: em.id,
              name: item.name || "Mặc định",
              color: item.color || "#3b82f6",
              orderIndex: groupOrder++
            }
          });
          detailOrder = 0;
        } else {
          if (!currentGroup) {
            currentGroup = await tx.marketingExecutionGroup.create({
              data: {
                monthId: em.id,
                name: "Mặc định",
                orderIndex: groupOrder++
              }
            });
          }

          const resolvedParentId = item.parentId ? detailIDMap.get(item.parentId) : null;

          const createdDetail = await tx.marketingExecutionDetail.create({
            data: {
              groupId: currentGroup.id,
              name: item.name || "",
              week: item.time || "",
              visual: item.visual || "",
              quantity: item.quantity || "",
              channel: item.channel || "",
              pic: item.pic || "",
              status: item.status || "pending",
              note: item.note || "",
              detailContent: item.detailContent || "",
              ads: item.ads || false,
              targetAudience: item.targetAudience || "",
              recordTime: item.recordTime || "",
              location: item.location || "",
              isDetail: !!item.isDetail,
              parentId: resolvedParentId,
              orderIndex: detailOrder++
            }
          });

          if (item.id) {
            detailIDMap.set(item.id, createdDetail.id);
          }
        }
      }
    }
  }
}

export async function processPlanSubmission(planId: string, data: any) {
  const { 
    goal, budget, selectedPlatforms, targetAudience, 
    goalsList, tasksList, strategyData, monthlyPlans,
    partialUpdateMonthly
  } = data;

  // Handle partial monthly update
  if (partialUpdateMonthly) {
    return await prisma.$transaction(async (tx) => {
      await saveMonthlyExecutionRoadmap(tx, planId, monthlyPlans);
      return { success: true };
    });
  }

  const budgetNum = typeof budget === 'string' ? Number(budget.replace(/\D/g, "")) : Number(budget || 0);

  // 1. Prepare Goals
  const goalsToCreate = (goalsList || []).map((g: any) => ({
    planId: planId, // Explicitly link
    label: g.label || "",
    description: g.description || "",
    icon: g.icon || "bi-record-circle",
    color: g.color || "#000000"
  }));

  // 2. Prepare Nested Task function
  const taskIdMap = new Map<string, string>(); // oldId -> newId

  async function createNestedTasks(tx: any, nodes: any[], parentId: string | null = null) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const createdTask = await tx.marketingYearlyTask.create({
        data: {
          planId: planId,
          parentId: parentId,
          name: node.name || "Chưa đặt tên",
          assigneeId: node.pic || null,
          color: node.color || "#000000",
          description: node.note || "",
          sortOrder: i
        }
      });
      
      if (node.id) taskIdMap.set(node.id, createdTask.id);

      if (node.children && node.children.length > 0) {
        await createNestedTasks(tx, node.children, createdTask.id);
      }
    }
  }

  // 3. Perform atomic update
  return await prisma.$transaction(async (tx) => {
    // A. Clear old data
    await tx.marketingYearlyGoal.deleteMany({ where: { planId } });
    await tx.marketingYearlyTask.deleteMany({ where: { planId } });
    await tx.outlineMarketingPlan.deleteMany({ where: { planId } });

    // B. Update/Create General Plan
    await tx.marketingGeneralPlan.upsert({
      where: { planId },
      update: {
        primaryGoal: goal,
        totalBudget: budgetNum,
        platforms: JSON.stringify(selectedPlatforms || []),
        targetAudience: JSON.stringify(targetAudience || {})
      },
      create: {
        planId,
        primaryGoal: goal,
        totalBudget: budgetNum,
        platforms: JSON.stringify(selectedPlatforms || []),
        targetAudience: JSON.stringify(targetAudience || {})
      }
    });

    // C. Create Goals (Explicitly)
    if (goalsToCreate.length > 0) {
      await tx.marketingYearlyGoal.createMany({
        data: goalsToCreate
      });
    }

    // D. Create Tasks (Recursively)
    if (tasksList && tasksList.length > 0) {
      await createNestedTasks(tx, tasksList);
    }

    // E. Save Strategy Data
    if (strategyData) {
      await tx.outlineMarketingPlan.create({
        data: {
          planId: planId,
          year: data.year || 2026,
          planData: JSON.stringify(strategyData)
        }
      });
    }

    // F. Save Budget Plan (Step 4)
    const ta = targetAudience || {};
    const parseNum = (val: any) => typeof val === 'string' ? parseFloat(val.replace(/\D/g, "") || "0") : Number(val || 0);
    const parseRate = (val: any) => typeof val === 'string' ? parseFloat(val.replace(/[^-0-9.]/g, "") || "0") : Number(val || 0);

    const budgetPlan = await tx.marketingBudgetPlan.upsert({
      where: { planId },
      update: {
        revenueGoal: parseNum(ta.budget_val_rev_goal),
        mktRate: parseRate(ta.budget_rate_mkt_total),
        mktValue: parseNum(ta.budget_val_mkt_total),
        agencyRate: parseRate(ta.budget_rate_agency),
        agencyValue: parseNum(ta.budget_val_agency),
        brandingRate: parseRate(ta.budget_rate_branding),
        brandingValue: parseNum(ta.budget_val_branding)
      },
      create: {
        planId,
        revenueGoal: parseNum(ta.budget_val_rev_goal),
        mktRate: parseRate(ta.budget_rate_mkt_total),
        mktValue: parseNum(ta.budget_val_mkt_total),
        agencyRate: parseRate(ta.budget_rate_agency),
        agencyValue: parseNum(ta.budget_val_agency),
        brandingRate: parseRate(ta.budget_rate_branding),
        brandingValue: parseNum(ta.budget_val_branding)
      }
    });

    // Clear and recreate budget items
    await tx.marketingBudgetItem.deleteMany({ where: { budgetPlanId: budgetPlan.id } });

    const budgetItems: any[] = [];
    
    // Agency Sub-rows
    (data.agencySubRows || []).forEach((row: any, idx: number) => {
      budgetItems.push({
        budgetPlanId: budgetPlan.id,
        type: "agency",
        name: row.label || "Hạng mục mới",
        rate: parseRate(ta[`budget_rate_${row.id}`]),
        value: parseNum(ta[`budget_val_${row.id}`]),
        note: ta[`budget_note_${row.id}`] || "",
        sortOrder: idx
      });
    });

    // Branding Sub-rows
    (data.brandingSubRows || []).forEach((row: any, idx: number) => {
      budgetItems.push({
        budgetPlanId: budgetPlan.id,
        type: "branding",
        name: row.label || "Hạng mục mới",
        rate: parseRate(ta[`budget_rate_${row.id}`]),
        value: parseNum(ta[`budget_val_${row.id}`]),
        note: ta[`budget_note_${row.id}`] || "",
        sortOrder: idx
      });
    });

    if (budgetItems.length > 0) {
      await tx.marketingBudgetItem.createMany({
        data: budgetItems
      });
    }

    // G. Save Monthly Budgets (Tab 4.2)
    // 1. Clear old monthly data
    await tx.marketingMonthlyBudgetTotal.deleteMany({ where: { budgetPlanId: budgetPlan.id } });
    // This is tricky because we need to clear details linked to items. 
    // Since we deleted items above, details are already cascaded if onDelete: Cascade is set.
    // Let's verify schema.
    
    const monthlyTotals: any[] = [];
    const monthlyItemDetails: any[] = [];

    // Fetch the newly created items to get their IDs
    const savedItems = await tx.marketingBudgetItem.findMany({
      where: { budgetPlanId: budgetPlan.id }
    });
    const savedItemMap = new Map(savedItems.map(si => [si.name, si.id]));

    for (let m = 1; m <= 12; m++) {
      const mKey = `m${m}`;
      const totalVal = parseNum(ta[`budget_${mKey}_monthly_total`]);
      
      if (totalVal > 0) {
        monthlyTotals.push({
          budgetPlanId: budgetPlan.id,
          month: m,
          totalValue: totalVal
        });
      }

      // Details for each sub-item
      // Note: We use name matching since IDs might have changed during save
      // We look at both agency and branding sub rows from the payload
      const allSubRows = [...(data.agencySubRows || []), ...(data.brandingSubRows || [])];
      
      allSubRows.forEach(row => {
        const val = parseNum(ta[`budget_${mKey}_val_${row.id}`]);
        const rate = parseRate(ta[`budget_${mKey}_rate_${row.id}`]);
        const note = ta[`budget_${mKey}_note_${row.id}`] || "";
        
        const dbItemId = savedItemMap.get(row.label);
        if (dbItemId && (val > 0 || rate > 0 || note)) {
          monthlyItemDetails.push({
            itemId: dbItemId,
            month: m,
            rate: rate,
            value: val,
            note: note
          });
        }
      });
    }

    if (monthlyTotals.length > 0) {
      await tx.marketingMonthlyBudgetTotal.createMany({
        data: monthlyTotals
      });
    }

    if (monthlyItemDetails.length > 0) {
      await tx.marketingMonthlyBudgetItem.createMany({
        data: monthlyItemDetails
      });
    }

    // H. Save Monthly Execution Roadmap (Step 3)
    if (monthlyPlans) {
      await saveMonthlyExecutionRoadmap(tx, planId, monthlyPlans, taskIdMap);
    }

    return { success: true };
  }, {
    timeout: 15000 // Increase timeout for recursive operations
  });
}

function parseWeeksAndDeadline(weekStr: string | null | undefined, year: number, month: number): {
  week1: boolean;
  week2: boolean;
  week3: boolean;
  week4: boolean;
  deadline: Date;
} {
  let w1 = false;
  let w2 = false;
  let w3 = false;
  let w4 = false;

  const lastDayOfMonth = new Date(year, month, 0).getDate();
  let maxWeek = 0;

  if (weekStr) {
    const trimmed = weekStr.trim();
    // Check if it looks like a date string (YYYY-MM-DD)
    const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      const dYear = parseInt(dateMatch[1], 10);
      const dMonth = parseInt(dateMatch[2], 10);
      const dDay = parseInt(dateMatch[3], 10);
      
      // If the date belongs to this month and year, map to appropriate week
      if (dYear === year && dMonth === month) {
        if (dDay <= 7) { w1 = true; maxWeek = 1; }
        else if (dDay <= 14) { w2 = true; maxWeek = 2; }
        else if (dDay <= 21) { w3 = true; maxWeek = 3; }
        else { w4 = true; maxWeek = 4; }
      } else {
        w1 = true;
        maxWeek = 1;
      }
    } else {
      // Split by comma or space and extract numbers 1, 2, 3, 4
      const tokens = trimmed.split(/[\s,]+/);
      for (const token of tokens) {
        if (token.includes("1") || token === "1") w1 = true;
        if (token.includes("2") || token === "2") w2 = true;
        if (token.includes("3") || token === "3") w3 = true;
        if (token.includes("4") || token === "4") w4 = true;
      }
      
      if (w4) maxWeek = 4;
      else if (w3) maxWeek = 3;
      else if (w2) maxWeek = 2;
      else if (w1) maxWeek = 1;
    }
  }

  // Calculate deadline based on maxWeek
  let deadline: Date;
  if (maxWeek === 1) {
    deadline = new Date(year, month - 1, 7, 23, 59, 59);
  } else if (maxWeek === 2) {
    deadline = new Date(year, month - 1, 14, 23, 59, 59);
  } else if (maxWeek === 3) {
    deadline = new Date(year, month - 1, 21, 23, 59, 59);
  } else {
    // maxWeek = 4 or 0 (no weeks)
    deadline = new Date(year, month - 1, lastDayOfMonth, 23, 59, 59);
  }

  return { week1: w1, week2: w2, week3: w3, week4: w4, deadline };
}

export async function syncMonthlyExecutionToMonthlyPlan(planId: string, monthNum: number, taskNameRaw: string) {
  // 1. Tìm task gốc cấp 1 trong kế hoạch năm (VD: "CONTENT", "TRADE", "SEO")
  // Chuẩn hóa tên để so khớp (bỏ khoảng trắng, viết hoa)
  const normalizedTaskName = taskNameRaw.replace(/\s+/g, "").toUpperCase();

  const yearlyTasks = await prisma.marketingYearlyTask.findMany({
    where: { planId }
  });

  const yearlyTask = yearlyTasks.find(t => 
    t.name.replace(/\s+/g, "").toUpperCase() === normalizedTaskName
  );
  if (!yearlyTask) return;

  // 2. Lấy dữ liệu thực thi của tháng đó (Execution Month)
  const em = await prisma.marketingExecutionMonth.findUnique({
    where: { 
      planId_taskId_month: { 
        planId, 
        taskId: yearlyTask.id, 
        month: monthNum 
      } 
    },
    include: {
      groups: {
        include: { tasks: { orderBy: { orderIndex: "asc" } } },
        orderBy: { orderIndex: "asc" }
      }
    }
  });
  if (!em) return;

  // 3. Tìm kế hoạch năm để lấy Năm và Người lập (Author) làm mặc định
  const plan = await prisma.marketingYearlyPlan.findUnique({ where: { id: planId } });
  if (!plan) return;

  // Xác định employeeId: Ưu tiên người phụ trách task đó, nếu không có thì lấy chủ kế hoạch năm
  const employeeId = yearlyTask.assigneeId || plan.authorId;
  if (!employeeId) return;

  // 4. Tìm hoặc tạo bản Kế hoạch tháng (MarketingMonthlyPlan) cho nhân viên này
  let mmp = await prisma.marketingMonthlyPlan.findUnique({
    where: { 
      year_month_employeeId: { 
        year: plan.year, 
        month: monthNum, 
        employeeId 
      } 
    }
  });

  if (!mmp) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    mmp = await prisma.marketingMonthlyPlan.create({
      data: {
        year: plan.year,
        month: monthNum,
        employeeId,
        employeeName: employee?.fullName || "Nhân viên Marketing",
        status: "approved"
      }
    });
  } else {
    // Luôn cập nhật trạng thái đã duyệt
    await prisma.marketingMonthlyPlan.update({
      where: { id: mmp.id },
      data: { status: "approved" }
    });
  }

  // 5. Đồng bộ Tasks
  // Chiến thuật: Xoá các task cũ thuộc Group này trong tháng và nạp lại từ bản duyệt mới
  let taskGroupKey = normalizedTaskName.toLowerCase();
  // Map đặc biệt cho THEME -> chu_de_thang để khớp với bảng Kế hoạch tháng
  if (taskGroupKey === "theme") taskGroupKey = "chu_de_thang";

  await prisma.marketingTask.deleteMany({
    where: { monthlyPlanId: mmp.id, taskGroup: taskGroupKey }
  });

  const tasksToCreate: any[] = [];
  let currentSortOrder = 0;

  for (const group of em.groups) {
    // A. Tạo Header Task (Đầu mục cha)
    tasksToCreate.push({
      monthlyPlanId: mmp.id,
      title: group.name,
      taskGroup: taskGroupKey,
      taskSubGroup: null, 
      taskType: "group",
      sortOrder: currentSortOrder++,
      status: "pending"
    });

    // B. Tạo các Task chi tiết
    for (const detail of group.tasks) {
      const parsedWeeks = parseWeeksAndDeadline(detail.week, plan.year, monthNum);
      
      tasksToCreate.push({
        monthlyPlanId: mmp.id,
        title: detail.name,
        description: detail.note || "",
        taskGroup: taskGroupKey,
        taskSubGroup: group.name, // Gắn vào header vừa tạo
        taskType: detail.channel?.toLowerCase() || "other",
        category: detail.channel || null,
        week1: parsedWeeks.week1,
        week2: parsedWeeks.week2,
        week3: parsedWeeks.week3,
        week4: parsedWeeks.week4,
        week1Content: parsedWeeks.week1 ? detail.detailContent : null,
        week2Content: parsedWeeks.week2 ? detail.detailContent : null,
        week3Content: parsedWeeks.week3 ? detail.detailContent : null,
        week4Content: parsedWeeks.week4 ? detail.detailContent : null,
        assigneeName: detail.pic || mmp.employeeName, // Fallback về người phụ trách nhóm
        channel: detail.channel || null,
        deadline: parsedWeeks.deadline,
        status: "pending",
        sortOrder: currentSortOrder++
      });
    }
  }

  if (tasksToCreate.length > 0) {
    await prisma.marketingTask.createMany({ data: tasksToCreate });
  }
}
