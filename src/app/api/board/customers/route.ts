import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in14Days = new Date(now.getTime() + 14 * 86400000);

    // ── Customers ─────────────────────────────────────────────────────────────
    const customers = await prisma.customer.findMany({
      select: {
        id: true, name: true, nguon: true, nhom: true,
        daiDien: true, xungHo: true, dienThoai: true, email: true,
        nguoiChamSocId: true,
        nguoiChamSoc: { select: { fullName: true } },
        createdAt: true,
        _count: {
          select: {
            saleOrders: true,
            careHistories: true,
            quotations: true,
            contracts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ── Quotations ─────────────────────────────────────────────────────────────
    const quotations = await prisma.quotation.findMany({
      select: {
        id: true, code: true, trangThai: true, uuTien: true,
        tongTien: true, thanhTien: true,
        ngayBaoGia: true, ngayHetHan: true,
        customerId: true,
        customer: { select: { id: true, name: true } },
        nguoiPhuTrach: { select: { fullName: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // ── Contracts ─────────────────────────────────────────────────────────────
    const contracts = await prisma.contract.findMany({
      select: {
        id: true, code: true, trangThai: true, uuTien: true,
        giaTriHopDong: true, daThanhToan: true, ghiChu: true,
        ngayKy: true, ngayBatDau: true, ngayKetThuc: true,
        customerId: true,
        customer: { select: { id: true, name: true } },
        nguoiPhuTrach: { select: { fullName: true, workEmail: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // ── Care histories (recent 50) ─────────────────────────────────────────────
    const careHistories = await prisma.customerCareHistory.findMany({
      select: {
        id: true, ngayChamSoc: true, hinhThuc: true, thaiDo: true,
        nhuCau: true, tomTat: true,
        customerId: true,
        customer: { select: { id: true, name: true } },
        nguoiChamSoc: { select: { fullName: true } },
      },
      orderBy: { ngayChamSoc: "desc" },
      take: 50,
    });

    // ── Retail invoices ────────────────────────────────────────────────────────
    const retailInvoices = await prisma.retailInvoice.findMany({
      select: {
        id: true, code: true, tenKhach: true, dienThoai: true,
        tongTien: true, chietKhau: true, vat: true, tongCong: true,
        hinhThucTT: true, trangThai: true, conNo: true,
        nguoiBan: { select: { fullName: true } },
        items: {
          select: { tenHang: true, soLuong: true, donGia: true, thanhTien: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Retail stats
    const now30 = new Date(now.getTime() - 30 * 86400000);
    const retailThisMonth = retailInvoices.filter(r => new Date(r.createdAt) >= startOfMonth);
    const retailRevenue   = retailThisMonth.reduce((s, r) => s + r.tongCong, 0);
    const retailCount     = retailThisMonth.length;
    // Top items
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const inv of retailThisMonth) {
      for (const item of inv.items) {
        if (!itemMap[item.tenHang]) itemMap[item.tenHang] = { name: item.tenHang, qty: 0, revenue: 0 };
        itemMap[item.tenHang].qty     += item.soLuong;
        itemMap[item.tenHang].revenue += item.thanhTien;
      }
    }
    const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Payment method breakdown
    const payMap: Record<string, number> = {};
    for (const r of retailThisMonth) {
      payMap[r.hinhThucTT] = (payMap[r.hinhThucTT] ?? 0) + 1;
    }

    // ── Computed stats ─────────────────────────────────────────────────────────
    const totalCustomers   = customers.length;
    const totalQuotations  = quotations.length;
    const totalContracts   = contracts.length;

    // Contract value
    const activeContracts  = contracts.filter(c => c.trangThai === "active");
    const overdueContracts = contracts.filter(c => c.trangThai === "overdue");
    const doneContracts    = contracts.filter(c => c.trangThai === "done");
    const contractRevenue  = activeContracts.reduce((s, c) => s + c.giaTriHopDong, 0);

    // Quotation funnel
    const quotationSent    = quotations.filter(q => q.trangThai === "sent" || q.trangThai === "approved");
    const quotationWon     = quotations.filter(q => q.trangThai === "won");
    const quotationLost    = quotations.filter(q => q.trangThai === "lost");

    // Nguon breakdown
    const nguonMap: Record<string, number> = {};
    for (const c of customers) {
      const key = c.nguon || "khac";
      nguonMap[key] = (nguonMap[key] ?? 0) + 1;
    }

    // Alerts
    const overdueContractList = contracts
      .filter(c => c.trangThai === "overdue" || (
        c.ngayKetThuc && new Date(c.ngayKetThuc) < now &&
        !["done", "cancelled"].includes(c.trangThai)
      ));
    const expiringQuotations = quotations.filter(q =>
      q.ngayHetHan &&
      new Date(q.ngayHetHan) <= in14Days &&
      new Date(q.ngayHetHan) > now &&
      !["won", "lost", "cancelled"].includes(q.trangThai)
    );

    return NextResponse.json({
      customers,
      quotations,
      contracts,
      careHistories,
      retailInvoices,
      stats: {
        totalCustomers, totalQuotations, totalContracts,
        activeContractsCount:  activeContracts.length,
        overdueContractsCount: overdueContracts.length,
        doneContractsCount:    doneContracts.length,
        contractRevenue,
        quotationSentCount:    quotationSent.length,
        quotationWonCount:     quotationWon.length,
        quotationLostCount:    quotationLost.length,
        nguonMap,
        retail: { revenue: retailRevenue, count: retailCount, topItems, payMap },
      },
      alerts: {
        overdueContracts:    overdueContractList,
        expiringQuotations,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/board/customers]", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
