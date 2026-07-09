import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function fetchPeriodData(start: Date, end: Date) {
  // Query B2B Orders
  const b2bOrders = await prisma.saleOrder.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      trangThai: { notIn: ["draft", "cancelled"] }
    }
  });

  // Query B2C Retail Invoices
  const retailInvoices = await prisma.retailInvoice.findMany({
    where: {
      createdAt: { gte: start, lt: end }
    }
  });

  // Calculate Revenue (Mã số 01)
  let revenue = 0;
  b2bOrders.forEach(o => revenue += (o.tongTien || 0));
  retailInvoices.forEach(r => revenue += (r.tongCong || 0));

  // Deductions (Mã số 02)
  const deductions = 0;

  // Net Revenue (Mã số 10)
  const netRevenue = revenue - deductions;

  // Calculate COGS (Mã số 11)
  // Query B2C items sold
  const invoiceItems = await prisma.retailInvoiceItem.findMany({
    where: {
      invoice: {
        createdAt: { gte: start, lt: end }
      }
    },
    include: {
      inventoryItem: true
    }
  });

  let b2cCogs = 0;
  invoiceItems.forEach(item => {
    b2cCogs += (item.soLuong || 0) * (item.inventoryItem?.giaNhap || 0);
  });

  // Estimate B2B COGS at 60% of B2B revenue
  let b2bRevenue = 0;
  b2bOrders.forEach(o => b2bRevenue += (o.tongTien || 0));
  const b2bCogs = Math.round(b2bRevenue * 0.6);

  const cogs = b2cCogs + b2bCogs;

  // Gross Profit (Mã số 20)
  const grossProfit = netRevenue - cogs;

  // Query Financial Income/Expenses & Operating Costs (Mã số 21, 22, 25, 26)
  const expenses = await prisma.expense.findMany({
    where: {
      ngayChiTra: { gte: start, lt: end },
      trangThai: "paid"
    }
  });

  const payrolls = await prisma.payroll.findMany({
    where: {
      createdAt: { gte: start, lt: end }
    }
  });

  let financialRevenue = 0;
  let financialExpense = 0;
  let interestExpense = 0;
  let sellingExpense = 0;
  let adminExpense = 0;

  // Classify expenses
  expenses.forEach(e => {
    const loai = (e.loai || "").toLowerCase();
    const name = (e.tenChiPhi || "").toLowerCase();

    if (loai === "tai-chinh" || loai === "finance" || name.includes("lãi vay") || name.includes("lãi suất")) {
      financialExpense += (e.soTien || 0);
      if (name.includes("lãi vay") || name.includes("lãi suất")) {
        interestExpense += (e.soTien || 0);
      }
    } else if (loai === "ban-hang" || loai === "marketing" || loai === "posm" || name.includes("bán hàng") || name.includes("marketing")) {
      sellingExpense += (e.soTien || 0);
    } else {
      adminExpense += (e.soTien || 0);
    }
  });

  // Add Payrolls to admin expense
  payrolls.forEach(p => {
    adminExpense += (p.tongChiPhiCty || p.luongThucNhan || p.luongCoBan || 0);
  });

  // Net Operating Profit (Mã số 30)
  const operatingProfit = grossProfit + financialRevenue - financialExpense - sellingExpense - adminExpense;

  // Other Incomes & Expenses (Mã số 31, 32, 40)
  const otherIncome = 0;
  const otherExpense = 0;
  const otherProfit = otherIncome - otherExpense;

  // Accounting Profit Before Tax (Mã số 50)
  const profitBeforeTax = operatingProfit + otherProfit;

  // Tax (Mã số 51)
  const tax = profitBeforeTax > 0 ? Math.round(profitBeforeTax * 0.20) : 0;

  // Profit After Tax (Mã số 60)
  const profitAfterTax = profitBeforeTax - tax;

  return {
    revenue,
    deductions,
    netRevenue,
    cogs,
    grossProfit,
    financialRevenue,
    financialExpense,
    interestExpense,
    sellingExpense,
    adminExpense,
    operatingProfit,
    otherIncome,
    otherExpense,
    otherProfit,
    profitBeforeTax,
    tax,
    profitAfterTax
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || "2026");
    const month = parseInt(searchParams.get("month") || "0"); // 0 means the whole year

    // ── 1. Calculate Current Period (Kỳ này) ──────────────────────────────────
    let start: Date;
    let end: Date;

    if (month === 0) {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
    } else {
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 1);
    }

    // ── 2. Calculate Previous Period (Kỳ trước) ───────────────────────────────
    let prevStart: Date;
    let prevEnd: Date;

    if (month === 0) {
      prevStart = new Date(year - 1, 0, 1);
      prevEnd = new Date(year, 0, 1);
    } else {
      // Month-on-Month comparison
      prevStart = new Date(year, month - 2, 1);
      prevEnd = new Date(year, month - 1, 1);
    }

    const [current, previous] = await Promise.all([
      fetchPeriodData(start, end),
      fetchPeriodData(prevStart, prevEnd)
    ]);

    const rows = [
      { code: "01", item: "1. Doanh thu bán hàng và cung cấp dịch vụ", note: "VI.01", current: current.revenue, previous: previous.revenue, isParent: true },
      { code: "02", item: "2. Các khoản giảm trừ doanh thu", note: "VI.02", current: current.deductions, previous: previous.deductions },
      { code: "10", item: "3. Doanh thu thuần về bán hàng và cung cấp dịch vụ", note: "VI.03", current: current.netRevenue, previous: previous.netRevenue, isParent: true, isCalculated: true },
      { code: "11", item: "4. Giá vốn hàng bán", note: "VI.08", current: current.cogs, previous: previous.cogs },
      { code: "20", item: "5. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ", note: "VI.09", current: current.grossProfit, previous: previous.grossProfit, isParent: true, isCalculated: true },
      { code: "21", item: "6. Doanh thu hoạt động tài chính", note: "VI.11", current: current.financialRevenue, previous: previous.financialRevenue },
      { code: "22", item: "7. Chi phí tài chính", note: "VI.12", current: current.financialExpense, previous: previous.financialExpense },
      { code: "23", item: "   - Trong đó: Chi phí lãi vay", note: "VI.13", current: current.interestExpense, previous: previous.interestExpense, isChild: true },
      { code: "25", item: "8. Chi phí bán hàng", note: "VI.14", current: current.sellingExpense, previous: previous.sellingExpense },
      { code: "26", item: "9. Chi phí quản lý doanh nghiệp", note: "VI.15", current: current.adminExpense, previous: previous.adminExpense },
      { code: "30", item: "10. Lợi nhuận thuần từ hoạt động kinh doanh", note: "VI.16", current: current.operatingProfit, previous: previous.operatingProfit, isParent: true, isCalculated: true },
      { code: "31", item: "11. Thu nhập khác", note: "VI.17", current: current.otherIncome, previous: previous.otherIncome },
      { code: "32", item: "12. Chi phí khác", note: "VI.18", current: current.otherExpense, previous: previous.otherExpense },
      { code: "40", item: "13. Lợi nhuận khác", note: "VI.19", current: current.otherProfit, previous: previous.otherProfit, isCalculated: true },
      { code: "50", item: "14. Tổng lợi nhuận kế toán trước thuế", note: "VI.20", current: current.profitBeforeTax, previous: previous.profitBeforeTax, isParent: true, isCalculated: true },
      { code: "51", item: "15. Chi phí thuế TNDN hiện hành", note: "VI.21", current: current.tax, previous: previous.tax },
      { code: "60", item: "16. Lợi nhuận sau thuế thu nhập doanh nghiệp", note: "VI.22", current: current.profitAfterTax, previous: previous.profitAfterTax, isParent: true, isCalculated: true }
    ];

    return NextResponse.json({
      success: true,
      rows
    });
  } catch (error: any) {
    console.error("[GET /api/board/finance-accounting/report] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
