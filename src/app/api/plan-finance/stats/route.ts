import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const queryYear = parseInt(searchParams.get("year") ?? "0");
    const now   = new Date();
    const y     = queryYear > 2000 ? queryYear : now.getFullYear();
    const start = new Date(`${y}-01-01`);
    const end   = new Date(`${y + 1}-01-01`);

    const [
      totalCustomers,
      newCustomersThisYear,
      totalSales,
      doneSales,
      totalExpenses,
      debtPhaiThu,
      debtPhaiTra,
      customersByMonth,
      salesByMonth,
      customersByNhom,
      customersByNguon,
      // Quotation stats
      quotationByStatus,
      totalQuotations,
      totalQuotationValue,
      wonQuotationValue,
      // Contract stats
      contractByStatus,
      totalContracts,
      totalContractValue,
      paidContractValue,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.saleOrder.count(),
      prisma.saleOrder.count({ where: { trangThai: "done" } }),
      prisma.expense.aggregate({ _sum: { soTien: true }, where: { trangThai: "paid" } }),
      prisma.debt.aggregate({ _sum: { soTien: true }, where: { loai: "phai-thu" } }),
      prisma.debt.aggregate({ _sum: { soTien: true }, where: { loai: "phai-tra" } }),
      // Phát sinh KH theo tháng
      prisma.customer.groupBy({
        by: ["createdAt"],
        where: { createdAt: { gte: start, lt: end } },
        _count: { id: true },
      }),
      // Phát sinh đơn bán theo tháng
      prisma.saleOrder.groupBy({
        by: ["createdAt"],
        where: { createdAt: { gte: start, lt: end } },
        _count: { id: true },
      }),
      // Breakdown KH theo nhóm
      prisma.customer.groupBy({
        by: ["nhom"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      // Breakdown KH theo nguồn
      prisma.customer.groupBy({
        by: ["nguon"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      // Báo giá theo trạng thái — toàn bộ (không lọc năm)
      prisma.quotation.groupBy({
        by: ["trangThai"],
        _count: { id: true },
      }),
      prisma.quotation.count(),
      prisma.quotation.aggregate({
        _sum: { thanhTien: true },
      }),
      prisma.quotation.aggregate({
        _sum: { thanhTien: true },
        where: { trangThai: "won" },
      }),
      // Hợp đồng theo trạng thái — toàn bộ (không lọc năm)
      prisma.contract.groupBy({
        by: ["trangThai"],
        _count: { id: true },
      }),
      prisma.contract.count(),
      prisma.contract.aggregate({
        _sum: { giaTriHopDong: true },
      }),
      prisma.contract.aggregate({
        _sum: { daThanhToan: true },
      }),
    ]);

    const toMonthArray = (rows: { createdAt: Date; _count: { id: number } }[]) => {
      const arr = Array(12).fill(0);
      for (const r of rows) arr[new Date(r.createdAt).getMonth()] += r._count.id;
      return arr;
    };

    const NHOM_LABEL: Record<string, string> = {
      "ca-nhan":      "Cá nhân",
      "doanh-nghiep": "Doanh nghiệp",
      "doi-tac":      "Đối tác",
      "khach-le":     "Khách lẻ",
    };
    const NGUON_LABEL: Record<string, string> = {
      "tu-nhien":   "Tự nhiên",
      "gioi-thieu": "Giới thiệu",
      "quang-cao":  "Quảng cáo",
      "khac":       "Khác",
    };

    // Quotation breakdown
    const Q_STATUS_LABELS: [string, string][] = [
      ["pending_approval", "Đang trình duyệt"],
      ["sent",             "Đã gửi khách hàng"],
      ["won",              "Thành công"],
      ["lost",             "Thất bại"],
    ];
    const qMap = Object.fromEntries(quotationByStatus.map(r => [r.trangThai, r._count.id]));

    // Contract breakdown
    const C_STATUS_LABELS: [string, string][] = [
      ["pending", "Chưa thực hiện"],
      ["active",  "Đang thực hiện"],
      ["delayed", "Chậm tiến độ"],
      ["overdue", "Đã quá hạn"],
    ];
    const cMap = Object.fromEntries(contractByStatus.map(r => [r.trangThai, r._count.id]));

    const nhomMap  = Object.fromEntries(customersByNhom.map(r  => [r.nhom  ?? "", r._count.id]));
    const nguonMap = Object.fromEntries(customersByNguon.map(r => [r.nguon ?? "", r._count.id]));

    return NextResponse.json({
      // Customer stats
      totalCustomers,
      newCustomersThisYear,
      totalSales,
      doneSales,
      conversionRate: totalSales > 0 ? Math.round((doneSales / totalSales) * 100) : 0,
      totalExpensesPaid: totalExpenses._sum.soTien ?? 0,
      debtPhaiThu: debtPhaiThu._sum.soTien ?? 0,
      debtPhaiTra: debtPhaiTra._sum.soTien ?? 0,
      customersByMonth: toMonthArray(customersByMonth),
      salesByMonth: toMonthArray(salesByMonth),
      customersByNhom: Object.entries(NHOM_LABEL).map(([key, label]) => ({
        label, value: nhomMap[key] ?? 0,
      })),
      customersByNguon: Object.entries(NGUON_LABEL).map(([key, label]) => ({
        label, value: nguonMap[key] ?? 0,
      })),
      // Quotation stats
      totalQuotations,
      totalQuotationValue: totalQuotationValue._sum.thanhTien ?? 0,
      wonQuotationValue: wonQuotationValue._sum.thanhTien ?? 0,
      conversionRateQuotation: totalQuotations > 0
        ? Math.round(((qMap["won"] ?? 0) / totalQuotations) * 100) : 0,
      quotationByStatus: Q_STATUS_LABELS.map(([key, label]) => ({ label, value: qMap[key] ?? 0 })),
      // Contract stats
      totalContracts,
      totalContractValue: totalContractValue._sum.giaTriHopDong ?? 0,
      paidContractValue: paidContractValue._sum.daThanhToan ?? 0,
      contractByStatus: C_STATUS_LABELS.map(([key, label]) => ({ label, value: cMap[key] ?? 0 })),
    });
  } catch (e: unknown) {
    console.error("[GET /plan-finance/stats]", e);
    return NextResponse.json({}, { status: 500 });
  }
}
