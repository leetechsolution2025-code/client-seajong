import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${currentYear + 1}-01-01T00:00:00.000Z`);

    // 1. Fetch DB data in parallel
    const [
      b2bOrders,
      retailInvoices,
      expenses,
      payrolls,
      totalCustomers,
      quotations,
      contracts,
      totalEmployees,
      salesPlan,
      unpaidDebts,
      allSalesReps
    ] = await Promise.all([
      // B2B Orders this year
      prisma.saleOrder.findMany({
        where: {
          createdAt: { gte: startOfYear, lt: endOfYear },
          trangThai: { notIn: ["draft", "cancelled"] }
        }
      }),
      // Retail Invoices this year
      prisma.retailInvoice.findMany({
        where: {
          createdAt: { gte: startOfYear, lt: endOfYear }
        }
      }),
      // Expenses paid this year
      prisma.expense.findMany({
        where: {
          ngayChiTra: { gte: startOfYear, lt: endOfYear },
          trangThai: "paid"
        }
      }),
      // Payrolls this year
      prisma.payroll.findMany({
        where: {
          createdAt: { gte: startOfYear, lt: endOfYear }
        }
      }),
      // Customer count
      prisma.customer.count(),
      // Quotations this year
      prisma.quotation.findMany({
        where: {
          createdAt: { gte: startOfYear, lt: endOfYear }
        },
        select: { id: true, trangThai: true, thanhTien: true }
      }),
      // Contracts this year
      prisma.contract.findMany({
        where: {
          createdAt: { gte: startOfYear, lt: endOfYear }
        },
        select: { id: true, trangThai: true, giaTriHopDong: true, daThanhToan: true }
      }),
      // Employees
      prisma.employee.count(),
      // Sales plan for target
      prisma.salesYearlyPlan.findUnique({
        where: { year: currentYear }
      }),
      // Debts unpaid
      prisma.debt.findMany({
        where: { status: "UNPAID" },
        select: { amount: true, dueDate: true }
      }),
      // Sales Reps count (employees in Sales department)
      prisma.employee.count({
        where: { departmentName: { contains: "Kinh doanh" } }
      })
    ]);

    // 2. Aggregate Revenue (Doanh thu)
    let yearlyB2BRevenue = 0;
    let monthlyB2BRevenue = 0;
    let prevMonthlyB2BRevenue = 0;

    b2bOrders.forEach(o => {
      const orderDate = new Date(o.createdAt);
      const m = orderDate.getMonth() + 1;
      yearlyB2BRevenue += (o.tongTien || 0);
      if (m === currentMonth) {
        monthlyB2BRevenue += (o.tongTien || 0);
      } else if (m === currentMonth - 1) {
        prevMonthlyB2BRevenue += (o.tongTien || 0);
      }
    });

    let yearlyB2CRevenue = 0;
    let monthlyB2CRevenue = 0;
    let prevMonthlyB2CRevenue = 0;

    retailInvoices.forEach(r => {
      const invoiceDate = new Date(r.createdAt);
      const m = invoiceDate.getMonth() + 1;
      yearlyB2CRevenue += (r.tongCong || 0);
      if (m === currentMonth) {
        monthlyB2CRevenue += (r.tongCong || 0);
      } else if (m === currentMonth - 1) {
        prevMonthlyB2CRevenue += (r.tongCong || 0);
      }
    });

    const yearlyRevenue = yearlyB2BRevenue + yearlyB2CRevenue;
    const monthlyRevenue = monthlyB2BRevenue + monthlyB2CRevenue;
    const prevMonthlyRevenue = prevMonthlyB2BRevenue + prevMonthlyB2CRevenue;

    // 3. Aggregate Expenses (Chi phí)
    let yearlyExpensesTotal = 0;
    let monthlyExpensesTotal = 0;

    expenses.forEach(e => {
      yearlyExpensesTotal += (e.soTien || 0);
      if (e.ngayChiTra && new Date(e.ngayChiTra).getMonth() + 1 === currentMonth) {
        monthlyExpensesTotal += (e.soTien || 0);
      }
    });

    let yearlyPayrollTotal = 0;
    let monthlyPayrollTotal = 0;

    payrolls.forEach(p => {
      const pDate = new Date(p.createdAt);
      yearlyPayrollTotal += (p.thucLinh || p.luongCoBan || 0);
      if (pDate.getMonth() + 1 === currentMonth) {
        monthlyPayrollTotal += (p.thucLinh || p.luongCoBan || 0);
      }
    });

    const yearlyCost = yearlyExpensesTotal + yearlyPayrollTotal;
    const monthlyCost = monthlyExpensesTotal + monthlyPayrollTotal;

    // 4. Aggregate Profit (Lợi nhuận)
    const yearlyProfit = yearlyRevenue - yearlyCost;

    // 5. Cash Flow (Dòng tiền)
    // Inflow: daThanhToan from B2BOrders + paid from retail invoices
    let yearlyCashInflow = 0;
    let monthlyCashInflow = 0;

    b2bOrders.forEach(o => {
      yearlyCashInflow += (o.daThanhToan || 0);
      if (new Date(o.createdAt).getMonth() + 1 === currentMonth) {
        monthlyCashInflow += (o.daThanhToan || 0);
      }
    });

    retailInvoices.forEach(r => {
      const paid = (r.tongCong || 0) - (r.conNo || 0);
      yearlyCashInflow += paid;
      if (new Date(r.createdAt).getMonth() + 1 === currentMonth) {
        monthlyCashInflow += paid;
      }
    });

    const yearlyCashFlow = yearlyCashInflow - yearlyCost;
    const monthlyCashFlow = monthlyCashInflow - monthlyCost;

    // Monthly data trends (T1 -> T12)
    const monthlyRevenueArray = Array(12).fill(0);
    const monthlyCostArray = Array(12).fill(0);
    const monthlyCashFlowArray = Array(12).fill(0);

    b2bOrders.forEach(o => {
      const m = new Date(o.createdAt).getMonth();
      monthlyRevenueArray[m] += (o.tongTien || 0);
      monthlyCashFlowArray[m] += (o.daThanhToan || 0);
    });
    retailInvoices.forEach(r => {
      const m = new Date(r.createdAt).getMonth();
      monthlyRevenueArray[m] += (r.tongCong || 0);
      monthlyCashFlowArray[m] += ((r.tongCong || 0) - (r.conNo || 0));
    });
    expenses.forEach(e => {
      if (e.ngayChiTra) {
        const m = new Date(e.ngayChiTra).getMonth();
        monthlyCostArray[m] += (e.soTien || 0);
        monthlyCashFlowArray[m] -= (e.soTien || 0);
      }
    });
    payrolls.forEach(p => {
      const m = new Date(p.createdAt).getMonth();
      const val = (p.thucLinh || p.luongCoBan || 0);
      monthlyCostArray[m] += val;
      monthlyCashFlowArray[m] -= val;
    });

    // Convert trends to chart series format (in billions)
    const chartSeries = [
      {
        name: "Doanh thu",
        data: monthlyRevenueArray.map((val, idx) => (idx + 1 > currentMonth && val === 0) ? null : Number((val / 1e9).toFixed(2))),
        color: "#3b82f6"
      },
      {
        name: "Chi phí",
        data: monthlyCostArray.map((val, idx) => (idx + 1 > currentMonth && val === 0) ? null : Number((val / 1e9).toFixed(2))),
        color: "#ef4444"
      },
      {
        name: "Dòng tiền",
        data: monthlyCashFlowArray.map((val, idx) => (idx + 1 > currentMonth && val === 0) ? null : Number((val / 1e9).toFixed(2))),
        color: "#10b981"
      }
    ];

    // Cash flow score (formula: 80% default, adjusted by cash flow ratio if revenue exists)
    let cashFlowScore = 75;
    if (monthlyRevenue > 0) {
      const ratio = monthlyCashFlow / monthlyRevenue;
      cashFlowScore = Math.min(95, Math.max(35, Math.round(75 + ratio * 20)));
    }

    // 6. Target Revenue from Plan
    let monthlyTargetRevenue = 3.5 * 1e9; // default 3.5B
    if (salesPlan) {
      try {
        const parsedTargets = JSON.parse(salesPlan.monthlyTargets || "{}");
        if (parsedTargets[currentMonth]?.chinhThuc) {
          monthlyTargetRevenue = parsedTargets[currentMonth].chinhThuc;
        } else {
          const planRows = JSON.parse(salesPlan.planRows || "[]");
          const totalRow = planRows.find((r: any) => r.stt === "1");
          if (totalRow?.target) {
            monthlyTargetRevenue = totalRow.target / 12;
          }
        }
      } catch (e) {}
    }

    // 7. Core Pillars Metrics
    // Pillar 1: Kinh doanh
    const totalRevenueProgress = monthlyTargetRevenue > 0 ? Math.min(100, Math.round((monthlyRevenue / monthlyTargetRevenue) * 100)) : 0;
    const totalQuotationsCount = quotations.length;
    const wonQuotationsCount = quotations.filter(q => q.trangThai === "won").length;
    const quotationWinRate = totalQuotationsCount > 0 ? Math.round((wonQuotationsCount / totalQuotationsCount) * 100) : 0;
    
    const totalOrdersCount = b2bOrders.length + retailInvoices.length;
    const averageOrderValue = totalOrdersCount > 0 ? Math.round(yearlyRevenue / totalOrdersCount) : 0;

    // Pillar 2: Tài chính
    const overdueDebts = unpaidDebts
      .filter(d => d.dueDate && new Date(d.dueDate) < now)
      .reduce((sum, d) => sum + d.amount, 0);

    // Pillar 3: Nhân sự
    const revenuePerFTE = totalEmployees > 0 ? Math.round(monthlyRevenue / totalEmployees) : 0;
    const salesRepCount = allSalesReps || 1;
    const salesPerRep = Math.round(monthlyB2BRevenue / salesRepCount);

    // Check if we have actual transactions in the DB
    const hasRealData = b2bOrders.length > 0 || retailInvoices.length > 0 || expenses.length > 0;

    return NextResponse.json({
      success: true,
      hasRealData,
      kpis: {
        yearlyRevenue: yearlyRevenue,
        monthlyRevenue: monthlyRevenue,
        yearlyCost: yearlyCost,
        yearlyProfit: yearlyProfit,
        revenueTrend: prevMonthlyRevenue > 0 ? Number(((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue * 100).toFixed(1)) : 0,
        costAccumulatedMonth: currentMonth
      },
      chartSeries,
      cashFlowScore,
      pillars: {
        commercial: {
          revenueProgress: totalRevenueProgress,
          revenueActual: monthlyRevenue,
          revenueTarget: monthlyTargetRevenue,
          winRate: quotationWinRate,
          wonCount: wonQuotationsCount,
          totalQuotations: totalQuotationsCount,
          aov: averageOrderValue,
          customersCount: totalCustomers
        },
        finance: {
          cashFlow: monthlyCashFlow,
          overdueDebts
        },
        hr: {
          revenuePerFTE,
          salesPerRep
        }
      }
    });
  } catch (err: any) {
    console.error("[GET /api/board/stats] error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
