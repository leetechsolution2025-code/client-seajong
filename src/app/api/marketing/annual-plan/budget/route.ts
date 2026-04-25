import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/marketing/annual-plan/budget?planId=...
export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get("planId");
  if (!planId) return NextResponse.json({ error: "Thiếu planId" }, { status: 400 });

  try {
    const budget = await prisma.marketingBudgetPlan.findUnique({
      where: { planId },
      include: {
        items: {
          include: { monthlyDetails: true }
        },
        monthlyTotals: true
      },
    });
    return NextResponse.json(budget || {});
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/marketing/annual-plan/budget
export async function POST(req: NextRequest) {
  try {
    const { planId, targetAudience, agencySubRows, brandingSubRows } = await req.json();

    if (!planId) return NextResponse.json({ error: "Thiếu planId" }, { status: 400 });

    const getNum = (val: any) => {
      if (typeof val === "string") {
        // Remove all dots (thousand separators) and replace comma with dot (decimal)
        const clean = val.replace(/\./g, "").replace(/,/g, ".");
        return parseFloat(clean || "0");
      }
      return Number(val || 0);
    };

    console.log("Saving budget for planId:", planId);

    // 1. Upsert Budget Plan Summary
    const budgetPlan = await prisma.marketingBudgetPlan.upsert({
      where: { planId },
      update: {
        revenueGoal: getNum(targetAudience.budget_val_rev_goal),
        mktRate: getNum(targetAudience.budget_rate_mkt_total),
        mktValue: getNum(targetAudience.budget_val_mkt_total),
        agencyRate: getNum(targetAudience.budget_rate_agency),
        agencyValue: getNum(targetAudience.budget_val_agency),
        brandingRate: getNum(targetAudience.budget_rate_branding),
        brandingValue: getNum(targetAudience.budget_val_branding),
      },
      create: {
        planId,
        revenueGoal: getNum(targetAudience.budget_val_rev_goal),
        mktRate: getNum(targetAudience.budget_rate_mkt_total),
        mktValue: getNum(targetAudience.budget_val_mkt_total),
        agencyRate: getNum(targetAudience.budget_rate_agency),
        agencyValue: getNum(targetAudience.budget_val_agency),
        brandingRate: getNum(targetAudience.budget_rate_branding),
        brandingValue: getNum(targetAudience.budget_val_branding),
      },
    });

    console.log("BudgetPlan upserted:", budgetPlan.id);

    // 2. Sync Sub-rows (Agency & Branding)
    const allSubRows = [
      ...agencySubRows.map((r: any) => ({ ...r, type: "agency" })),
      ...brandingSubRows.map((r: any) => ({ ...r, type: "branding" }))
    ];

    for (const sub of allSubRows) {
      // Use a consistent ID mapping for client-side generated IDs
      const dbId = sub.id.length > 20 ? sub.id : `idx_${sub.id}`; 

      const budgetItem = await prisma.marketingBudgetItem.upsert({
        where: { id: dbId },
        update: {
          name: sub.label,
          rate: getNum(targetAudience[`budget_rate_${sub.id}`]),
          value: getNum(targetAudience[`budget_val_${sub.id}`]),
          note: targetAudience[`budget_note_${sub.id}`] || "",
        },
        create: {
          id: dbId,
          budgetPlanId: budgetPlan.id,
          type: sub.type,
          name: sub.label,
          rate: getNum(targetAudience[`budget_rate_${sub.id}`]),
          value: getNum(targetAudience[`budget_val_${sub.id}`]),
          note: targetAudience[`budget_note_${sub.id}`] || "",
        },
      });

      console.log("BudgetItem upserted:", budgetItem.id);

      // 3. Sync Monthly Item Details
      for (let m = 1; m <= 12; m++) {
        const mKey = `m${m}`;
        const mRate = getNum(targetAudience[`budget_${mKey}_rate_${sub.id}`]);
        const mVal = getNum(targetAudience[`budget_${mKey}_val_${sub.id}`]);
        const mNote = targetAudience[`budget_${mKey}_note_${sub.id}`] || "";

        if (mRate || mVal || mNote) {
          await prisma.marketingMonthlyBudgetItem.upsert({
            where: { itemId_month: { itemId: budgetItem.id, month: m } },
            update: { rate: mRate, value: mVal, note: mNote },
            create: { itemId: budgetItem.id, month: m, rate: mRate, value: mVal, note: mNote },
          });
        }
      }
    }

    // 4. Sync Monthly Totals
    for (let m = 1; m <= 12; m++) {
      const mKey = `m${m}`;
      const mTotalVal = getNum(targetAudience[`budget_${mKey}_monthly_total`]);
      if (mTotalVal) {
        await prisma.marketingMonthlyBudgetTotal.upsert({
          where: { budgetPlanId_month: { budgetPlanId: budgetPlan.id, month: m } },
          update: { totalValue: mTotalVal },
          create: { budgetPlanId: budgetPlan.id, month: m, totalValue: mTotalVal },
        });
      }
    }

    return NextResponse.json({ success: true, budgetPlanId: budgetPlan.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi lưu ngân sách" }, { status: 500 });
  }
}
