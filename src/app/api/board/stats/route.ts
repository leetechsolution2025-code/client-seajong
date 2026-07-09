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
      customers,
      quotations,
      contracts,
      totalEmployees,
      masterPlan,
      unpaidDebts,
      allSalesReps,
      totalKeyEmployees,
      resignedKeyEmployeesData,
      attendancesThisMonth,
      dbAssets,
      dbLoans,
      receivables,
      salesYearlyPlan
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
      prisma.customer.findMany({ select: { createdAt: true } }),
      // Quotations this year
      prisma.quotation.findMany({
        where: {
          createdAt: { gte: startOfYear, lt: endOfYear }
        },
        select: { id: true, trangThai: true, thanhTien: true, createdAt: true }
      }),
      // Contracts this year
      prisma.contract.findMany({
        where: {
          createdAt: { gte: startOfYear, lt: endOfYear }
        },
        select: { id: true, trangThai: true, giaTriHopDong: true, daThanhToan: true, createdAt: true }
      }),
      // Employees
      prisma.employee.count(),
      // Sales plan for target
      prisma.masterYearlyPlan.findUnique({
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
      }),
      // Key Personnel Total
      prisma.employee.count({
        where: { level: { not: "staff" } }
      }),
      // Key Personnel Resigned
      prisma.employee.findMany({
        where: { 
          level: { not: "staff" },
          status: { in: ["resigned", "inactive", "terminated"] }
        },
        select: { updatedAt: true }
      }),
      // Attendances this month
      prisma.attendance.findMany({
        where: {
          date: { gte: new Date(`${currentYear}-${currentMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`) }
        },
        select: { status: true, checkInMorning: true }
      }),
      // Assets
      prisma.asset.findMany(),
      // Loans
      prisma.debt.findMany({ where: { type: "LOAN" } }),
      // Receivables
      prisma.debt.findMany({ where: { type: "phai-thu" } }),
      // Detailed Sales Plan
      prisma.salesYearlyPlan.findUnique({ where: { year: currentYear } })
    ]);

    // 2. Aggregate Revenue (Doanh thu) based on Accounts Receivable (phai-thu)
    let yearlyRevenue = 0;
    let monthlyRevenue = 0;
    let prevMonthlyRevenue = 0;
    
    // Monthly data trends (T1 -> T12)
    const monthlyRevenueArray = Array(12).fill(0);
    const monthlyCostArray = Array(12).fill(0);
    const monthlyCashFlowArray = Array(12).fill(0);

    receivables.forEach(r => {
      // Use updatedAt or createdAt for the month of the collected revenue
      const m = new Date(r.updatedAt).getMonth();
      const collected = r.paidAmount || 0;
      
      yearlyRevenue += collected;
      if (m + 1 === currentMonth) {
        monthlyRevenue += collected;
      } else if (m + 1 === currentMonth - 1) {
        prevMonthlyRevenue += collected;
      }
      
      monthlyRevenueArray[m] += collected;
      // Revenue collected is also Cash Inflow
      monthlyCashFlowArray[m] += collected;
    });

    // 3. Aggregate Expenses (Chi phí)
    let yearlyExpensesTotal = 0;
    let monthlyExpensesTotal = 0;

    expenses.forEach(e => {
      yearlyExpensesTotal += (e.soTien || 0);
      if (e.ngayChiTra && new Date(e.ngayChiTra).getMonth() + 1 === currentMonth) {
        monthlyExpensesTotal += (e.soTien || 0);
      }
    });

    // Virtual Expenses: Depreciation & Loan Interests
    const virtualCostArray = Array(12).fill(0);
    for (let m = 0; m < currentMonth; m++) {
      const targetMonthDate = new Date(currentYear, m, 1);
      
      // Depreciation
      dbAssets.forEach(asset => {
        const originalValue = asset.giaTriMua || 0;
        const totalMonths = asset.soThangKhauHao || 0;
        if (originalValue <= 0 || totalMonths <= 0) return;
        const start = asset.ngayBatDauKhauHao ? new Date(asset.ngayBatDauKhauHao) : (asset.ngayMua ? new Date(asset.ngayMua) : null);
        if (!start) return;
        const startNorm = new Date(start.getFullYear(), start.getMonth(), 1);
        const elapsed = (targetMonthDate.getFullYear() - startNorm.getFullYear()) * 12 + (targetMonthDate.getMonth() - startNorm.getMonth());
        if (elapsed >= 0 && elapsed < totalMonths) {
          virtualCostArray[m] += Math.round(originalValue / totalMonths);
        }
      });

      // Loan Interest
      dbLoans.forEach(loan => {
        const startDate = new Date(loan.createdAt);
        const monthlyInterest = (loan.amount * (loan.interestRate || 0)) / 100 / 12;
        if (monthlyInterest <= 0) return;
        const startNorm = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        if (targetMonthDate >= startNorm) {
          virtualCostArray[m] += Math.round(monthlyInterest);
        }
      });

      // Add to yearly/monthly totals
      yearlyExpensesTotal += virtualCostArray[m];
      if (m + 1 === currentMonth) {
        monthlyExpensesTotal += virtualCostArray[m];
      }
    }

    let yearlyPayrollTotal = 0;
    let monthlyPayrollTotal = 0;

    payrolls.forEach(p => {
      const pDate = new Date(p.createdAt);
      yearlyPayrollTotal += (p.tongChiPhiCty || p.luongThucNhan || p.luongCoBan || 0);
      if (pDate.getMonth() + 1 === currentMonth) {
        monthlyPayrollTotal += (p.tongChiPhiCty || p.luongThucNhan || p.luongCoBan || 0);
      }
    });

    const yearlyCost = yearlyExpensesTotal + yearlyPayrollTotal;
    const monthlyCost = monthlyExpensesTotal + monthlyPayrollTotal;

    // 4. Aggregate Profit (Lợi nhuận)
    const yearlyProfit = yearlyRevenue - yearlyCost;

    // 5. Cash Flow (Dòng tiền)
    let yearlyCashInflow = yearlyRevenue; // Using receivables as source of cash inflow
    let monthlyCashInflow = monthlyRevenue;

    const yearlyCashFlow = yearlyCashInflow - yearlyCost;
    const monthlyCashFlow = monthlyCashInflow - monthlyCost;
    expenses.forEach(e => {
      if (e.ngayChiTra) {
        const m = new Date(e.ngayChiTra).getMonth();
        monthlyCostArray[m] += (e.soTien || 0);
        monthlyCashFlowArray[m] -= (e.soTien || 0);
      }
    });
    payrolls.forEach(p => {
      const m = new Date(p.createdAt).getMonth();
      const val = (p.tongChiPhiCty || p.luongThucNhan || p.luongCoBan || 0);
      monthlyCostArray[m] += val;
      monthlyCashFlowArray[m] -= val;
    });

    // Add virtual costs to arrays
    for (let m = 0; m < 12; m++) {
      monthlyCostArray[m] += virtualCostArray[m];
      monthlyCashFlowArray[m] -= virtualCostArray[m];
    }

    const chartSeries = [
      {
        name: "Doanh thu",
        data: monthlyRevenueArray.map((val, idx) => (idx + 1 > currentMonth && val === 0) ? null : Math.round(val)),
        color: "#3b82f6"
      },
      {
        name: "Chi phí",
        data: monthlyCostArray.map((val, idx) => (idx + 1 > currentMonth && val === 0) ? null : Math.round(val)),
        color: "#ef4444"
      },
      {
        name: "Dòng tiền",
        data: monthlyCashFlowArray.map((val, idx) => (idx + 1 > currentMonth && val === 0) ? null : Math.round(val)),
        color: "#10b981"
      }
    ];

    // Cash flow score (formula: 80% default, adjusted by cash flow ratio if revenue exists)
    let cashFlowScore = 75;
    if (monthlyRevenue > 0) {
      const ratio = monthlyCashFlow / monthlyRevenue;
      cashFlowScore = Math.min(95, Math.max(35, Math.round(75 + ratio * 20)));
    } else if (monthlyCashFlow < 0) {
      // If no revenue but cash is bleeding
      cashFlowScore = 35;
    } else if (monthlyCashFlow === 0 && monthlyCost === 0) {
      // No activity
      cashFlowScore = 50; // Neutral
    }

    // 6. Target Revenue from Plan
    let monthlyTargetRevenue = 0;
    
    // First, try to get specific monthly target from SalesYearlyPlan
    if (salesYearlyPlan && salesYearlyPlan.monthlyTargets) {
      try {
        const monthlyTargetsData = JSON.parse(salesYearlyPlan.monthlyTargets);
        const mData = monthlyTargetsData[currentMonth];
        if (mData && mData.revenueRows) {
          monthlyTargetRevenue = mData.revenueRows.reduce((sum: number, row: any) => sum + (Number(row.value) || 0), 0);
        }
      } catch (e) {
        console.error("Parse sales yearly plan error:", e);
      }
    }

    // Fallback to Master Plan (Total / 12) if SalesYearlyPlan is missing or empty for this month
    let yearlyTargetRevenue = 3.5 * 1e9 * 12; // default
    if (masterPlan && masterPlan.planData) {
      try {
        const d = JSON.parse(masterPlan.planData);
        const totalYearlyRevenue = 
          (Number(d.revenueAgent) || 0) + 
          (Number(d.revenueAgentDev) || 0) + 
          (Number(d.revenueTraditional) || 0) + 
          (Number(d.revenueEcommerce) || 0);
        
        if (totalYearlyRevenue > 0) {
          yearlyTargetRevenue = totalYearlyRevenue;
          if (!monthlyTargetRevenue) {
            monthlyTargetRevenue = totalYearlyRevenue / 12;
          }
        }
      } catch (e) {}
    }
    
    // Final fallback
    if (!monthlyTargetRevenue) monthlyTargetRevenue = 3.5 * 1e9;

    // 7. Core Pillars Metrics
    // Pillar 1: Kinh doanh
    const totalRevenueProgress = monthlyTargetRevenue > 0 ? Math.min(100, Math.round((monthlyRevenue / monthlyTargetRevenue) * 100)) : 0;
    const yearlyRevenueProgress = yearlyTargetRevenue > 0 ? Math.min(100, Math.round((yearlyRevenue / yearlyTargetRevenue) * 100)) : 0;
    const totalQuotationsCount = quotations.length;
    const wonQuotationsCount = quotations.filter(q => q.trangThai === "won").length;
    const quotationWinRate = totalQuotationsCount > 0 ? Math.round((wonQuotationsCount / totalQuotationsCount) * 100) : 0;
    
    const monthlyQuotations = quotations.filter(q => new Date(q.createdAt).getMonth() + 1 === currentMonth);
    const monthlyWonQuotations = monthlyQuotations.filter(q => q.trangThai === "won");
    const monthlyQuotationWinRate = monthlyQuotations.length > 0 ? Math.round((monthlyWonQuotations.length / monthlyQuotations.length) * 100) : 0;
    
    const totalOrdersCount = b2bOrders.length + retailInvoices.length;
    const averageOrderValue = totalOrdersCount > 0 ? Math.round(yearlyRevenue / totalOrdersCount) : 0;
    
    const monthlyB2B = b2bOrders.filter(o => new Date(o.createdAt).getMonth() + 1 === currentMonth);
    const monthlyRetail = retailInvoices.filter(o => new Date(o.createdAt).getMonth() + 1 === currentMonth);
    const monthlyOrdersCount = monthlyB2B.length + monthlyRetail.length;
    const monthlyAov = monthlyOrdersCount > 0 ? Math.round(monthlyRevenue / monthlyOrdersCount) : 0;

    // Pillar 2: Tài chính
    const overdueDebts = unpaidDebts
      .filter(d => d.dueDate && new Date(d.dueDate) < now)
      .reduce((sum, d) => sum + d.amount, 0);

    // Pillar 3: Nhân sự
    const yearlyRevenuePerFTE = totalEmployees > 0 ? Math.round(yearlyRevenue / totalEmployees) : 0;
    const monthlyRevenuePerFTE = totalEmployees > 0 ? Math.round(monthlyRevenue / totalEmployees) : 0;
    const salesRepCount = allSalesReps || 1;
    const yearlySalesPerRep = Math.round(yearlyRevenue / salesRepCount);
    const monthlySalesPerRep = Math.round(monthlyRevenue / salesRepCount);

    const monthlyCustomersCount = customers.filter(c => new Date(c.createdAt).getMonth() + 1 === currentMonth).length;
    const yearlyCustomersCount = customers.filter(c => new Date(c.createdAt).getFullYear() === currentYear).length;

    const resignedKeyEmployeesYear = resignedKeyEmployeesData.filter(e => new Date(e.updatedAt).getFullYear() === currentYear).length;
    const resignedKeyEmployeesMonth = resignedKeyEmployeesData.filter(e => new Date(e.updatedAt).getMonth() + 1 === currentMonth).length;

    const turnoverRate = totalKeyEmployees > 0 ? Number((resignedKeyEmployeesData.length / totalKeyEmployees * 100).toFixed(1)) : 0;
    const yearlyTurnoverRate = totalKeyEmployees > 0 ? Number((resignedKeyEmployeesYear / totalKeyEmployees * 100).toFixed(1)) : 0;
    const monthlyTurnoverRate = totalKeyEmployees > 0 ? Number((resignedKeyEmployeesMonth / totalKeyEmployees * 100).toFixed(1)) : 0;
    
    let onTimeCount = 0;
    let validAttendances = 0;
    attendancesThisMonth.forEach((a: any) => {
      if (a.status === "present") {
        validAttendances++;
        if (a.checkInMorning) {
          const checkIn = new Date(a.checkInMorning);
          const hours = checkIn.getUTCHours() + 7; // Convert to UTC+7
          const minutes = checkIn.getUTCMinutes();
          const timeInMinutes = hours * 60 + minutes;
          if (timeInMinutes <= 8 * 60 + 30) { // Before 8:30 AM
            onTimeCount++;
          }
        }
      }
    });
    const onTimeRate = validAttendances > 0 ? Number((onTimeCount / validAttendances * 100).toFixed(1)) : 0;

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
          revenueYearlyProgress: yearlyRevenueProgress,
          revenueYearlyActual: yearlyRevenue,
          revenueYearlyTarget: yearlyTargetRevenue,
          winRate: quotationWinRate,
          monthlyWinRate: monthlyQuotationWinRate,
          wonCount: wonQuotationsCount,
          monthlyWonCount: monthlyWonQuotations.length,
          totalQuotations: totalQuotationsCount,
          monthlyTotalQuotations: monthlyQuotations.length,
          aov: averageOrderValue,
          monthlyAov: monthlyAov,
          customersCount: customers.length,
          yearlyCustomersCount: yearlyCustomersCount,
          monthlyCustomersCount: monthlyCustomersCount
        },
        finance: {
          cashFlow: monthlyCashFlow,
          overdueDebts
        },
        hr: {
          revenuePerFTE: monthlyRevenuePerFTE,
          yearlyRevenuePerFTE: yearlyRevenuePerFTE,
          salesPerRep: monthlySalesPerRep,
          yearlySalesPerRep: yearlySalesPerRep,
          turnoverRate: turnoverRate,
          yearlyTurnoverRate: yearlyTurnoverRate,
          monthlyTurnoverRate: monthlyTurnoverRate,
          onTimeRate
        }
      }
    });
  } catch (err: any) {
    console.error("[GET /api/board/stats] error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
