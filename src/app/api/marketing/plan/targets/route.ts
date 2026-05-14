import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/marketing/plan/targets?year=2026
 *
 * Trả về ngân sách kế hoạch và doanh thu mục tiêu theo từng tháng
 * từ kế hoạch năm đang hiệu lực (isCurrent = true).
 *
 * Response:
 * {
 *   monthlyBudget: [{ month: 1, value: 5000000 }, ...],   // Từ MarketingMonthlyBudgetTotal
 *   monthlyRevenue: [{ month: 1, seajong: X, voriger: Y, total: Z }, ...], // Từ OutlineMarketingPlan.planData
 *   totalBudget: number,
 *   totalRevenue: number,
 * }
 */
export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  try {
    // 1. Tìm kế hoạch đang hiệu lực
    const currentPlan = await prisma.marketingYearlyPlan.findFirst({
      where: { year, isCurrent: true },
      include: {
        budgetPlan: {
          include: { monthlyTotals: true }
        }
      }
    });

    if (!currentPlan) {
      return NextResponse.json({
        monthlyBudget: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, value: 0 })),
        monthlyRevenue: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, seajong: 0, voriger: 0, total: 0 })),
        totalBudget: 0,
        totalRevenue: 0,
      });
    }

    // 2. Ngân sách kế hoạch từng tháng
    const budgetTotalsByMonth = new Map<number, number>();
    if (currentPlan.budgetPlan?.monthlyTotals) {
      for (const t of currentPlan.budgetPlan.monthlyTotals) {
        budgetTotalsByMonth.set(t.month, t.totalValue);
      }
    }
    const monthlyBudget = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      value: budgetTotalsByMonth.get(i + 1) || 0
    }));

    // 3. Doanh thu mục tiêu từ OutlineMarketingPlan.planData (JSON blob)
    const outline = await prisma.outlineMarketingPlan.findUnique({
      where: { planId: currentPlan.id }
    });

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      seajong: 0,
      voriger: 0,
      total: 0
    }));

    if (outline?.planData) {
      try {
        const planData = JSON.parse(outline.planData);
        const ta = planData?.targetAudience || planData || {};

        const getNum = (val: any): number => {
          if (!val) return 0;
          const str = String(val).replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.]/g, "");
          return parseFloat(str) || 0;
        };

        for (let m = 1; m <= 12; m++) {
          // Doanh thu Seajong = tổng các sub-rows: sj_ke, sj_chinh_thuc, sj_le
          const sjKe     = getNum(ta[`rev_m${m}_sj_ke_total`]);
          const sjChThu  = getNum(ta[`rev_m${m}_sj_chinh_thuc_total`]);
          const sjLe     = getNum(ta[`rev_m${m}_sj_le_total`]);
          const seajong  = sjKe + sjChThu + sjLe;

          // Doanh thu Voriger = tổng các sub-rows: vg_shopee, vg_b2b, vg_khach_ngoai
          const vgShopee = getNum(ta[`rev_m${m}_vg_shopee_total`]);
          const vgB2b    = getNum(ta[`rev_m${m}_vg_b2b_total`]);
          const vgKhach  = getNum(ta[`rev_m${m}_vg_khach_ngoai_total`]);
          const voriger  = vgShopee + vgB2b + vgKhach;

          monthlyRevenue[m - 1] = {
            month: m,
            seajong,
            voriger,
            total: seajong + voriger
          };
        }
      } catch (e) {
        console.error("Failed to parse planData for revenue targets:", e);
      }
    }

    const totalBudget = monthlyBudget.reduce((s, x) => s + x.value, 0);
    const totalRevenue = monthlyRevenue.reduce((s, x) => s + x.total, 0);

    return NextResponse.json({
      monthlyBudget,
      monthlyRevenue,
      totalBudget,
      totalRevenue,
    });
  } catch (err) {
    console.error("GET /api/marketing/plan/targets error:", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
