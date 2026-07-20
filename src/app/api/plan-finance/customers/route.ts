import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

// GET /api/plan-finance/customers
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const search = searchParams.get("search") ?? "";
    const nguon  = searchParams.get("nguon")  ?? "";
    const nhom   = searchParams.get("nhom")   ?? "";
    const loai   = searchParams.get("loai")   ?? "";

    const where = {
      ...(search && { name: { contains: search } }),
      ...(nguon  && { nguon }),
      ...(nhom   && { nhom }),
      ...(loai   && { loai }),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: { 
          nguoiChamSoc: { select: { id: true, fullName: true } },
          contracts: { select: { giaTriHopDong: true, trangThai: true, code: true, ngayKy: true } }
        },
      }),
    ]);

    // Query outstanding debts for customers
    const customerNames = customers.map(c => c.name).filter(Boolean);
    const customerDebts = await prisma.debt.findMany({
      where: {
        partnerName: { in: customerNames },
        type: { in: ["RECEIVABLE", "phai-thu"] },
      },
      select: {
        partnerName: true,
        amount: true,
        paidAmount: true,
      }
    });

    const debtMap = new Map<string, number>();
    for (const d of customerDebts) {
      const outstanding = (d.amount || 0) - (d.paidAmount || 0);
      const prev = debtMap.get(d.partnerName) || 0;
      debtMap.set(d.partnerName, prev + outstanding);
    }

    const customerIds = customers.map(c => c.id);

    // Query yearly sales (from current year)
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);
    const yearlyOrders = await prisma.saleOrder.findMany({
      where: {
        customerId: { in: customerIds },
        trangThai: { notIn: ["cancelled", "draft"] },
        createdAt: {
          gte: startOfYear,
          lte: endOfYear
        }
      },
      select: {
        customerId: true,
        tongTien: true
      }
    });

    const yearlySalesMap = new Map<string, number>();
    for (const o of yearlyOrders) {
      if (o.customerId) {
        const prev = yearlySalesMap.get(o.customerId) || 0;
        yearlySalesMap.set(o.customerId, prev + (o.tongTien || 0));
      }
    }

    // Query committed sales (try partner contract in customer formValues first, fallback to Contract table)
    const committedSalesMap = new Map<string, number>();
    for (const c of customers) {
      let committed = 0;
      if (c.formValues) {
        try {
          const fVals = JSON.parse(c.formValues);
          const rawRevenue = fVals.hdAnnualRevenue;
          if (rawRevenue) {
            const cleanRevenue = String(rawRevenue).replace(/\./g, "").trim();
            const parsedRev = parseFloat(cleanRevenue);
            if (!isNaN(parsedRev)) {
              committed = parsedRev;
            }
          }
        } catch (e) {}
      }
      if (committed > 0) {
        committedSalesMap.set(c.id, committed);
      }
    }

    const missingIds = customerIds.filter(id => !committedSalesMap.has(id));
    if (missingIds.length > 0) {
      try {
        const contracts = await prisma.contract.findMany({
          where: { customerId: { in: missingIds } },
          orderBy: { createdAt: "desc" }
        });
        const seen = new Set<string>();
        for (const contract of contracts) {
          if (contract.customerId && !seen.has(contract.customerId)) {
            seen.add(contract.customerId);
            committedSalesMap.set(contract.customerId, contract.giaTriHopDong || 0);
          }
        }
      } catch (e) {
        console.error("Lỗi đọc contract table cho list:", e);
      }
    }

    const customersWithDebt = customers.map(c => ({
      ...c,
      outstandingDebt: debtMap.get(c.name) || 0,
      creditLimit: c.hanMucCongNo,
      yearlySales: yearlySalesMap.get(c.id) || 0,
      committedSales: committedSalesMap.get(c.id) || 0,
    }));

    return NextResponse.json({ customers: customersWithDebt, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (e) {
    console.error("[GET /customers]", e);
    return NextResponse.json({ customers: [], total: 0, page: 1, totalPages: 1 });
  }
}

// POST /api/plan-finance/customers
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, address, nguon, nhom, loai, daiDien, xungHo, chucVu, dienThoai, email, ghiChu, nguoiChamSocId, ngayTao, hanMucCongNo } = body;

    const resolvedName = name?.trim() || daiDien?.trim() || "—";

    const customer = await prisma.customer.create({
      data: {
        name: resolvedName, address, nguon, nhom, loai, daiDien, xungHo, chucVu, dienThoai, email, ghiChu,
        hanMucCongNo: parseFloat(hanMucCongNo) || 0,
        ...(nguoiChamSocId && { nguoiChamSocId }),
        ...(ngayTao && { createdAt: new Date(ngayTao) }),
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /customers]", msg);
    return NextResponse.json({ error: `Lỗi: ${msg}` }, { status: 500 });
  }
}

