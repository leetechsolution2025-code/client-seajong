import { prisma } from "@/lib/prisma";

/**
 * Process a marketing plan submission with full nested data.
 * Uses explicit creation to avoid Prisma 'missing argument' errors on SQLite.
 */
export async function processPlanSubmission(planId: string, data: any) {
  const { 
    goal, budget, selectedPlatforms, targetAudience, 
    goalsList, tasksList, strategyData, monthlyPlans,
    partialUpdateMonthly
  } = data;

  // Handle partial monthly update
  if (partialUpdateMonthly) {
    // 1. Fetch tasks to map names to IDs
    const tasks = await prisma.marketingYearlyTask.findMany({
      where: { planId: planId }
    });
    const taskMap = new Map(tasks.map(t => [t.name, t.id]));

    return await prisma.$transaction(async (tx) => {
      // Clear old execution months
      await tx.marketingExecutionMonth.deleteMany({ where: { planId } });

      // 2. Create new execution months with nested groups and details
      for (const [monthStr, tasksByMonth] of Object.entries(monthlyPlans || {})) {
        const monthInt = parseInt(monthStr);
        for (const [taskName, taskDataRaw] of Object.entries(tasksByMonth as any)) {
          const taskData = taskDataRaw as any;
          const taskId = taskMap.get(taskName);
          if (taskId) {
            await tx.marketingExecutionMonth.create({
              data: {
                planId: planId,
                taskId: taskId,
                month: monthInt,
                groups: {
                  create: [{
                    name: "Mặc định",
                    tasks: {
                      create: [{
                        name: taskName,
                        detailContent: taskData.content || "",
                        status: taskData.status || "pending"
                      }]
                    }
                  }]
                }
              }
            });
          }
        }
      }
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

    return { success: true };
  }, {
    timeout: 10000 // Increase timeout for recursive operations
  });
}
