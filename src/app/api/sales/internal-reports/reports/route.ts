import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Removed mock functions

const calculateScore = (target: number, actual: number, weight: number): number => {
  if (target === 0) return 0;
  const ratio = actual / target;
  let point = 0;
  if (ratio >= 1.2) point = 1.2;
  else if (ratio >= 1.0) point = 1.0 + (ratio - 1.0);
  else if (ratio >= 0.9) point = 0.9 + (ratio - 0.9);
  else if (ratio >= 0.8) point = 0.8;
  else if (ratio >= 0.7) point = 0.7;
  else return 0;
  return Math.round(point * weight);
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || new Date().getMonth() + 1 + "");
    const year = parseInt(searchParams.get("year") || new Date().getFullYear() + "");
    const type = searchParams.get("type"); // "MANAGER" or "STAFF"
    const employeeId = searchParams.get("employeeId");

    // Lấy config gốc
    let criteria = await prisma.internalKpiCriteria.findMany({
      where: {
        month,
        year,
        ...(type ? { type } : {})
      },
      orderBy: { createdAt: "asc" }
    });

    if (criteria.length === 0) {
      // Tìm cấu hình gần nhất (cùng type) để lấy cấu trúc tên tiêu chí
      const latest = await prisma.internalKpiCriteria.findFirst({
        where: type ? { type } : undefined,
        orderBy: [{ year: "desc" }, { month: "desc" }]
      });
      if (latest) {
        const baseCriteria = await prisma.internalKpiCriteria.findMany({
          where: { month: latest.month, year: latest.year, ...(type ? { type } : {}) },
          orderBy: { createdAt: "asc" }
        });
        criteria = baseCriteria.map((c: any) => ({
          ...c,
          id: c.id + "_mock",
          month,
          year,
          targetValue: 0,
          weight: 0
        }));
      }
      
      // Nếu vẫn không có (ví dụ latest không có data), dùng default
      if (criteria.length === 0) {
        const defaultManager = ["Doanh thu phòng đạt được", "Số đại lý phát triển trong tháng", "Doanh số bình quân từ đại lý mới", "Tỷ lệ đại lý phát sinh đơn hàng", "Tỷ lệ thu hồi công nợ", "Tỷ lệ nhân viên hoàn thành KPI"];
        const defaultStaff = ["Doanh số", "Doanh thu", "Số đại lý phát triển trong tháng", "Tỷ lệ chăm sóc đúng hạn", "Tỷ lệ chuyển đổi", "Thu hồi công nợ"];
        criteria = type === "MANAGER" ? defaultManager.map(name => ({ id: name, month, year, name, type: "MANAGER", targetValue: 0, weight: 0, code: null, isActive: true, createdAt: new Date(), updatedAt: new Date() })) 
                   : type === "STAFF" ? defaultStaff.map(name => ({ id: name, month, year, name, type: "STAFF", targetValue: 0, weight: 0, code: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }))
                   : [
                       ...defaultManager.map(name => ({ id: name, month, year, name, type: "MANAGER", targetValue: 0, weight: 0, code: null, isActive: true, createdAt: new Date(), updatedAt: new Date() })),
                       ...defaultStaff.map(name => ({ id: name, month, year, name, type: "STAFF", targetValue: 0, weight: 0, code: null, isActive: true, createdAt: new Date(), updatedAt: new Date() }))
                     ];
      }
    }

    // Logic giả lập: Nếu chưa có report, tự sinh ra từ config và mock actual
    let whereClause: any = { month, year };
    if (type) whereClause.type = type;
    if (employeeId) whereClause.employeeId = employeeId;
    // We can't query by undefined if we want to find records without employeeId cleanly in Prisma without a bit of care, but passing undefined ignores the filter.

    // Fetch target from SalesYearlyPlan if exists
    let planTotalRevenue = -1;
    let planTotalDealers = -1;
    try {
      const plan = await prisma.salesYearlyPlan.findUnique({
        where: { year }
      });
      if (plan && plan.monthlyTargets) {
        const monthlyTargets = JSON.parse(plan.monthlyTargets);
        const targetData = monthlyTargets[month];
        if (targetData) {
          planTotalDealers = (targetData.chinhThuc || 0) + (targetData.lapKe || 0) + (targetData.layHangLe || 0);
          planTotalRevenue = (targetData.revenueRows || []).reduce((acc: number, row: any) => acc + (row.value || 0), 0);
        }
      }
    } catch (e) {
      console.error("Error fetching SalesYearlyPlan targets", e);
    }

    // Update DB with the plan targets automatically if it's not a mock
    if (planTotalRevenue !== -1 && planTotalDealers !== -1) {
      for (let i = 0; i < criteria.length; i++) {
        const c = criteria[i];
        if (c.type === "MANAGER") {
          let updated = false;
          if (c.name.toLowerCase().includes("doanh thu phòng") && c.targetValue !== planTotalRevenue) {
            c.targetValue = planTotalRevenue;
            updated = true;
          } else if (c.name.toLowerCase().includes("số đại lý phát triển") && c.targetValue !== planTotalDealers) {
            c.targetValue = planTotalDealers;
            updated = true;
          }
          if (updated && !c.id.includes("_mock") && c.id !== c.name && !c.id.includes("Doanh thu")) {
            await prisma.internalKpiCriteria.update({
              where: { id: c.id },
              data: { targetValue: c.targetValue }
            });
          }
        }
      }
    }

    let report = await prisma.internalKpiReport.findFirst({
      where: whereClause,
      include: { details: true }
    });

    // Merge detail vào criteria để trả về frontend dễ hiển thị
    const reportList = criteria.map((c: any) => {
      const detail = report?.details.find((d: any) => d.criteriaId === c.id);
      
      let finalTarget = detail ? detail.targetValue : c.targetValue;
      // Ghi đè tự động từ kế hoạch năm để hiển thị luôn chuẩn nhất
      if (c.type === "MANAGER" && planTotalRevenue !== -1 && c.name.toLowerCase().includes("doanh thu phòng")) {
         finalTarget = planTotalRevenue;
      }
      if (c.type === "MANAGER" && planTotalDealers !== -1 && c.name.toLowerCase().includes("số đại lý phát triển")) {
         finalTarget = planTotalDealers;
      }

      return {
        id: c.id,
        name: c.name,
        target: finalTarget,
        actual: detail ? detail.actualValue : 0,
        weight: detail ? detail.weight : c.weight,
        score: detail ? detail.score : 0
      };
    });

    return NextResponse.json({
      success: true,
      data: reportList,
      totalScore: report?.totalScore || 0
    });

  } catch (error: any) {
    console.error("API Error - GET /reports:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
