import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/board/sales-snapshot — lấy lịch sử 6 tháng gần nhất
export async function GET() {
  try {
    const snapshots = await prisma.monthlySalesSnapshot.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
    });
    return NextResponse.json({ success: true, data: snapshots });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// POST /api/board/sales-snapshot — chốt số tháng hiện tại từ dữ liệu thực
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const now  = new Date();
    const year  = body.year  ?? now.getFullYear();
    const month = body.month ?? (now.getMonth() + 1);
    const note  = body.note  ?? null;

    // Tổng hợp số liệu thực tế từ DB
    const [customers, quotations, contracts, retailInvoices] = await Promise.all([
      prisma.customer.count(),
      prisma.quotation.findMany({ select: { trangThai: true } }),
      prisma.contract.findMany({ select: { trangThai: true, giaTriHopDong: true, daThanhToan: true } }),
      prisma.retailInvoice.findMany({ select: { tongCong: true, conNo: true } }),
    ]);

    const quotationWon   = quotations.filter(q => q.trangThai === "won").length;
    const quotationLost  = quotations.filter(q => q.trangThai === "lost").length;
    const contractActive  = contracts.filter(c => c.trangThai === "active").length;
    const contractDone    = contracts.filter(c => c.trangThai === "done").length;
    const contractOverdue = contracts.filter(c => c.trangThai === "overdue" || c.trangThai === "delayed").length;
    const contractValue   = contracts.reduce((s, c) => s + c.giaTriHopDong, 0);
    const contractPaid    = contracts.reduce((s, c) => s + c.daThanhToan, 0);
    const retailRevenue   = retailInvoices.reduce((s, r) => s + r.tongCong, 0);
    const retailDebt      = retailInvoices.reduce((s, r) => s + r.conNo, 0);

    const snapshot = await prisma.monthlySalesSnapshot.upsert({
      where:  { year_month: { year, month } },
      create: {
        year, month, note,
        totalCustomers: customers,
        quotationCount: quotations.length, quotationWon, quotationLost,
        contractCount: contracts.length, contractActive, contractDone, contractOverdue,
        contractValue, contractPaid,
        retailCount: retailInvoices.length, retailRevenue, retailDebt,
      },
      update: {
        note,
        totalCustomers: customers,
        quotationCount: quotations.length, quotationWon, quotationLost,
        contractCount: contracts.length, contractActive, contractDone, contractOverdue,
        contractValue, contractPaid,
        retailCount: retailInvoices.length, retailRevenue, retailDebt,
      },
    });

    return NextResponse.json({ success: true, data: snapshot });
  } catch (err) {
    console.error("[sales-snapshot] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
