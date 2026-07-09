import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch raw expenses, expense_type categories, active fixed assets, payrolls, and loans
    const [rawExpenses, dbCategories, dbAssets, dbPayrolls, dbLoans] = await Promise.all([
      prisma.expense.findMany({
        orderBy: { ngayChiTra: "desc" }
      }),
      prisma.category.findMany({
        where: { type: "expense_type", isActive: true },
        orderBy: { sortOrder: "asc" }
      }),
      prisma.asset.findMany(),
      prisma.payroll.findMany(),
      prisma.bankLoan.findMany({
        where: { status: "ACTIVE" }
      })
    ]);

    // Map categories for easy lookup
    const catMap: Record<string, string> = {};
    dbCategories.forEach(c => {
      catMap[c.code] = c.name;
    });

    // 2. Format database expenses
    const dbExpenses = rawExpenses.map(e => {
      const amount = e.soTien || 0;
      const categoryName = e.loai ? (catMap[e.loai] || "Khác") : "Khác";
      const dateStr = e.ngayChiTra ? e.ngayChiTra.toISOString().split("T")[0] : "";

      return {
        id: e.id,
        tenChiPhi: e.tenChiPhi,
        loai: e.loai || "",
        categoryName,
        soTien: amount,
        ngayChiTra: dateStr,
        nguoiChiTra: e.nguoiChiTra || "",
        trangThai: e.trangThai || "pending",
        ghiChu: e.ghiChu || "",
        referenceType: e.referenceType,
        referenceId: e.referenceId
      };
    });

    // 3. Calculate straight-line depreciation, aggregated payrolls, and loan interests for each month (January to June 2026)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const virtualExpenses: any[] = [];

    for (let m = 1; m <= currentMonth; m++) {
      const targetMonthDate = new Date(currentYear, m - 1, 1);

      // A. Asset Depreciation
      let monthlyDepreciationTotal = 0;
      dbAssets.forEach(asset => {
        const originalValue = asset.giaTriMua || 0;
        const totalMonths = asset.soThangKhauHao || 0;
        if (originalValue <= 0 || totalMonths <= 0) return;

        const start = asset.ngayBatDauKhauHao 
          ? new Date(asset.ngayBatDauKhauHao) 
          : (asset.ngayMua ? new Date(asset.ngayMua) : null);
        if (!start) return;

        const startNorm = new Date(start.getFullYear(), start.getMonth(), 1);
        const elapsed = (targetMonthDate.getFullYear() - startNorm.getFullYear()) * 12 + (targetMonthDate.getMonth() - startNorm.getMonth());

        if (elapsed >= 0 && elapsed < totalMonths) {
          monthlyDepreciationTotal += Math.round(originalValue / totalMonths);
        }
      });

      if (monthlyDepreciationTotal > 0) {
        virtualExpenses.push({
          id: `virtual-depreciation-2026-${String(m).padStart(2, "0")}`,
          tenChiPhi: "Khấu hao tài sản cố định",
          loai: "khau-hao",
          categoryName: "Khấu hao tài sản cố định",
          soTien: monthlyDepreciationTotal,
          ngayChiTra: `${currentYear}-${String(m).padStart(2, "0")}-28`,
          nguoiChiTra: "Hệ thống tự động",
          trangThai: "paid",
          ghiChu: "Chi phí khấu hao được trích tự động từ các tài sản cố định đang vận hành trong tháng."
        });
      }

      // B. Aggregated Payroll (Salary)
      const monthlyPayrolls = dbPayrolls.filter(p => p.nam === currentYear && p.thang === m);
      if (monthlyPayrolls.length > 0) {
        const salarySum = monthlyPayrolls.reduce((sum, p) => sum + (p.tongChiPhiCty || 0), 0);
        if (salarySum > 0) {
          const allPaid = monthlyPayrolls.every(p => p.trangThai === "da-tra");
          virtualExpenses.push({
            id: `virtual-payroll-2026-${String(m).padStart(2, "0")}`,
            tenChiPhi: "Chi phí lương nhân viên",
            loai: "payroll",
            categoryName: "Chi phí nhân sự",
            soTien: salarySum,
            ngayChiTra: `${currentYear}-${String(m).padStart(2, "0")}-25`,
            nguoiChiTra: "Hệ thống tự động",
            trangThai: allPaid ? "paid" : "pending",
            ghiChu: "Tổng hợp chi phí lương và bảo hiểm của tất cả nhân sự trong tháng."
          });
        }
      }

      // C. Ensure pending expenses exist for active bank loans up to the current month
      // We will only do this for the current month to avoid generating too much history if they just started using it.
      // Or we can just let them use the "Gửi YC Chi" button. But to be safe, let's not mutate DB in GET.
      // Since the user asked "Nếu có chi phí trả nợ vay cho các tháng thì phải thêm vào Chi phí chờ thanh toán",
      // we can generate virtual pending expenses that can be paid.
      // Actually, since we added the "Gửi YC Chi" button, we will just remove the automatic PAID virtual interests.
      // Wait, let's auto-generate virtual pending expenses for the current month!
      // But we can't pay them easily. Let's just remove this block. The user can use the "Gửi YC chi" button.
      // Wait, let's just generate the virtual ones but intercept them in the PUT request!
    } // End of month loop

    // Process virtual expenses for Bank Loans
    dbLoans.forEach(loan => {
      const disbursementDate = loan.disbursementDate ? new Date(loan.disbursementDate) : new Date(loan.createdAt);
      const term = loan.termMonths || 12;
      const loanAmount = loan.loanAmount || 0;
      const interestRate = loan.interestRate || 0;
      const maturityDate = loan.maturityDate || new Date(new Date(disbursementDate).setMonth(disbursementDate.getMonth() + term));

      if (loan.repaymentMethod === "goc_lai_cuoi_ky") {
        // Generate only ONE pending expense for the maturity date
        const totalInterest = (loanAmount * interestRate * term) / 100 / 12;
        const hasRealExpense = dbExpenses.some(e => e.referenceType === "bank_loan" && e.referenceId === loan.id && (e.tenChiPhi.includes("Tất toán") || e.tenChiPhi.includes("Cuối kỳ")));
        
        if (!hasRealExpense) {
          virtualExpenses.push({
            id: `virtual-interest-${loan.id}-maturity`,
            tenChiPhi: `Thanh toán khoản vay ${loan.bankName} (Tất toán)`,
            loai: "interest",
            categoryName: "Chi phí tài chính",
            soTien: Math.round(loanAmount + totalInterest),
            ngayChiTra: maturityDate.toISOString().split("T")[0],
            nguoiChiTra: "Hệ thống tự động",
            trangThai: "pending",
            ghiChu: JSON.stringify({ principalPayment: loanAmount, interestPayment: Math.round(totalInterest), contractNumber: loan.contractNumber }),
            referenceType: "bank_loan",
            referenceId: loan.id
          });
        }
      } else {
        // For other methods, generate monthly installments up to current month of current year
        for (let m = 1; m <= currentMonth; m++) {
          const targetMonthDate = new Date(currentYear, m - 1, 1);
          const startNorm = new Date(disbursementDate.getFullYear(), disbursementDate.getMonth(), 1);
          
          if (targetMonthDate >= startNorm) {
            const hasRealExpense = dbExpenses.some(e => e.referenceType === "bank_loan" && e.referenceId === loan.id && e.tenChiPhi.includes(`Tháng ${m}/${currentYear}`));
            
            if (!hasRealExpense) {
              const monthlyInterest = (loanAmount * interestRate) / 100 / 12;
              let monthlyPrincipal = 0;
              
              if (loan.repaymentMethod === "goc_deu_lai_giam" || loan.repaymentMethod === "tra_gop_deu") {
                monthlyPrincipal = loanAmount / term;
              } else if (loan.repaymentMethod === "lai_hang_thang_goc_cuoi_ky") {
                if (m === maturityDate.getMonth() + 1 && currentYear === maturityDate.getFullYear()) {
                  monthlyPrincipal = loanAmount;
                }
              }

              if (monthlyInterest > 0 || monthlyPrincipal > 0) {
                virtualExpenses.push({
                  id: `virtual-interest-${loan.id}-${currentYear}-${String(m).padStart(2, "0")}`,
                  tenChiPhi: `Thanh toán khoản vay ${loan.bankName} (Kỳ Tháng ${m}/${currentYear})`,
                  loai: "interest",
                  categoryName: "Chi phí tài chính",
                  soTien: Math.round(monthlyPrincipal + monthlyInterest),
                  ngayChiTra: `${currentYear}-${String(m).padStart(2, "0")}-28`, // default monthly due date
                  nguoiChiTra: "Hệ thống tự động",
                  trangThai: "pending",
                  ghiChu: JSON.stringify({ principalPayment: Math.round(monthlyPrincipal), interestPayment: Math.round(monthlyInterest), month: m, year: currentYear, contractNumber: loan.contractNumber }),
                  referenceType: "bank_loan",
                  referenceId: loan.id
                });
              }
            }
          }
        }
      }
    });

    // Merge database expenses and virtual expenses
    const expenses = [...dbExpenses, ...virtualExpenses];

    // Ensure virtual categories exist in categories array
    const categories = dbCategories.map(c => ({ id: c.id, code: c.code, name: c.name, parentId: c.parentId }));
    if (!categories.some(c => c.code === "khau-hao")) {
      categories.push({ id: "cat-khau-hao", code: "khau-hao", name: "Khấu hao tài sản cố định", parentId: null });
    }
    if (!categories.some(c => c.code === "payroll")) {
      categories.push({ id: "cat-payroll", code: "payroll", name: "Chi phí nhân sự", parentId: null });
    }
    if (!categories.some(c => c.code === "interest")) {
      categories.push({ id: "cat-interest", code: "interest", name: "Chi phí tài chính", parentId: null });
    }

    // Calculate summaries
    let totalExpenses = 0;
    let paidExpenses = 0;
    let unpaidExpenses = 0;

    expenses.forEach(e => {
      totalExpenses += e.soTien;
      const statusLower = e.trangThai.toLowerCase();
      if (statusLower === "paid" || statusLower === "approved") {
        paidExpenses += e.soTien;
      } else {
        unpaidExpenses += e.soTien;
      }
    });

    return NextResponse.json({
      success: true,
      expenses,
      categories,
      summary: {
        total: totalExpenses,
        paid: paidExpenses,
        unpaid: unpaidExpenses,
        count: expenses.length
      }
    });
  } catch (error: any) {
    console.error("[GET /api/board/finance-accounting/expenses] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
