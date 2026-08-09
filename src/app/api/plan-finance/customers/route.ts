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
    const pageSize = parseInt(searchParams.get("pageSize") ?? "10");
    const search = searchParams.get("search") ?? "";
    const nguon  = searchParams.get("nguon")  ?? "";
    const nhom   = searchParams.get("nhom")   ?? "";
    const loai   = searchParams.get("loai")   ?? "";

    const employeeIdFilter = searchParams.get("employeeId") ?? "";

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      include: { employee: true }
    });
    
    // Admins or Managers see all. Normal users only see their own assigned customers.
    const isManager = user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "SUPERADMIN";

    const where: any = {
      ...(search && { name: { contains: search } }),
      ...(nguon  && { nguon }),
      ...(nhom   && { nhom }),
      ...(loai   && { loai }),
    };

    const isDepartmentHead = user?.employee?.position === "vtr-20260401-1964-sbmg" || user?.employee?.position?.toLowerCase().includes("trưởng phòng");
    const isFinance = user?.employee?.departmentCode === "finance" || user?.employee?.departmentName?.includes("Kế toán") || user?.employee?.departmentName?.includes("Tài chính");

    if (!isManager && !isFinance && user?.employee?.id) {
      if (isDepartmentHead && user.employee.departmentCode) {
        const deptEmployees = await prisma.employee.findMany({
          where: { departmentCode: user.employee.departmentCode },
          select: { id: true }
        });
        const deptEmpIds = deptEmployees.map(e => e.id);
        
        if (employeeIdFilter) {
          where.nguoiChamSocId = employeeIdFilter;
        } else {
          where.nguoiChamSocId = { in: deptEmpIds };
        }
      } else {
        where.nguoiChamSocId = employeeIdFilter || user.employee.id;
      }
    } else if (employeeIdFilter) {
      where.nguoiChamSocId = employeeIdFilter;
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { 
          nguoiChamSoc: { select: { id: true, fullName: true } },
          contracts: { select: { giaTriHopDong: true, trangThai: true, code: true, ngayKy: true } }
        },
      }),
    ]);

    const customerIds = customers.map(c => c.id);
    const customerDebts = await prisma.debt.findMany({
      where: {
        customerId: { in: customerIds },
        type: { in: ["RECEIVABLE", "phai-thu"] },
      },
      select: {
        customerId: true,
        amount: true,
        paidAmount: true,
      }
    });

    const debtMap = new Map<string, number>();
    for (const d of customerDebts) {
      if (d.customerId) {
        const outstanding = (d.amount || 0) - (d.paidAmount || 0);
        const prev = debtMap.get(d.customerId) || 0;
        debtMap.set(d.customerId, prev + outstanding);
      }
    }

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
      let committed = (c as any).doanhSoCamKet || 0;
      if (!committed && c.formValues) {
        try {
          const fVals = typeof c.formValues === "string" ? JSON.parse(c.formValues) : c.formValues;
          if (fVals.doanhSoCamKet) {
            committed = parseFloat(fVals.doanhSoCamKet);
          } else if (fVals.hdAnnualRevenue) {
            const cleanRevenue = String(fVals.hdAnnualRevenue).replace(/\./g, "").trim();
            const parsedRev = parseFloat(cleanRevenue);
            if (!isNaN(parsedRev)) {
              committed = parsedRev;
            }
          }
        } catch (e) {}
      }
      
      console.log(`[DEBUG] Customer ${c.name}, DB doanhSoCamKet: ${(c as any).doanhSoCamKet}, Form formValues: ${c.formValues}, Final committed: ${committed}`);

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
      outstandingDebt: debtMap.get(c.id) || 0,
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
    const { name, address, nguon, nhom, loai, daiDien, xungHo, chucVu, dienThoai, email, ghiChu, nguoiChamSocId, ngayTao, hanMucCongNo, formValues } = body;

    const resolvedName = name?.trim() || daiDien?.trim() || "—";

    let doanhSoCamKet = 0;
    let thuongThanhToan = "";
    let thuongDoanhSoNam = "";
    let thuongVuotDoanhSo = "";
    if (formValues) {
      try {
        const fv = typeof formValues === "string" ? JSON.parse(formValues) : formValues;
        doanhSoCamKet = fv.doanhSoCamKet || 0;
        thuongThanhToan = fv.thuongThanhToan || "";
        thuongDoanhSoNam = fv.thuongDoanhSoNam || "";
        thuongVuotDoanhSo = fv.thuongVuotDoanhSo || "";
      } catch (e) {}
    }

    const customer = await prisma.customer.create({
      data: {
        name: resolvedName, address, nguon, nhom, loai, daiDien, xungHo, chucVu, dienThoai, email, ghiChu,
        hanMucCongNo: parseFloat(hanMucCongNo) || 0,
        formValues: typeof formValues === "object" ? JSON.stringify(formValues) : formValues,
        doanhSoCamKet,
        thuongThanhToan,
        thuongDoanhSoNam,
        thuongVuotDoanhSo,
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

