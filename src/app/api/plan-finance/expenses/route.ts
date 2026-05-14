import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 15;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search    = searchParams.get("search")    ?? "";
    const trangThai = searchParams.get("trangThai") ?? "";
    const loai      = searchParams.get("loai")      ?? "";
    const dateFrom  = searchParams.get("dateFrom")  ?? "";
    const dateTo    = searchParams.get("dateTo")    ?? "";

    const where = {
      ...(search    && { tenChiPhi: { contains: search } }),
      ...(trangThai && { trangThai }),
      ...(loai      && { loai }),
      ...(dateFrom || dateTo
        ? {
            ngayChiTra: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo   && { lte: new Date(dateTo + "T23:59:59") }),
            },
          }
        : {}),
    };

    // 1. Fetch manual expenses
    const manualItems = await prisma.expense.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 2. Aggregate Automated Expenses
    const automatedItems: any[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // A. Asset Depreciation
    const assets = await prisma.asset.findMany({
      where: {
        trangThai: "dang-su-dung",
        ngayBatDauKhauHao: { not: null },
        soThangKhauHao: { gt: 0 }
      }
    });

    assets.forEach(asset => {
      const startDate = new Date(asset.ngayBatDauKhauHao!);
      const monthlyAmount = asset.giaTriMua / (asset.soThangKhauHao || 1);
      
      // Generate for each month from start to now
      let iterDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (iterDate <= now) {
        const itemDate = new Date(iterDate);
        automatedItems.push({
          id: `AUTO_ASSET_${asset.id}_${itemDate.getFullYear()}_${itemDate.getMonth()}`,
          tenChiPhi: `Khấu hao: ${asset.tenTaiSan}`,
          loai: "exp-20260401-8491-ewer", // Hardcoded category for depreciation
          soTien: Math.round(monthlyAmount),
          ngayChiTra: itemDate,
          nguoiChiTra: "Hệ thống tự động",
          trangThai: "paid",
          ghiChu: `Khấu hao định kỳ tháng ${itemDate.getMonth() + 1}/${itemDate.getFullYear()}`,
          isAutomated: true
        });
        iterDate.setMonth(iterDate.getMonth() + 1);
      }
    });

    // B. Loan Interest
    const loans = await prisma.debt.findMany({
      where: { type: "LOAN" }
    });

    loans.forEach(loan => {
      const startDate = new Date(loan.createdAt);
      const monthlyInterest = (loan.amount * (loan.interestRate || 0)) / 100 / 12;
      
      let iterDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (iterDate <= now) {
        const itemDate = new Date(iterDate);
        automatedItems.push({
          id: `AUTO_LOAN_${loan.id}_${itemDate.getFullYear()}_${itemDate.getMonth()}`,
          tenChiPhi: `Lãi vay: ${loan.partnerName}`,
          loai: "exp-20260401-6053-cqse", // Hardcoded category for loan interest
          soTien: Math.round(monthlyInterest),
          ngayChiTra: itemDate,
          nguoiChiTra: "Hệ thống tự động",
          trangThai: "paid",
          ghiChu: `Lãi suất ${loan.interestRate}%/năm cho khoản vay ${loan.referenceId}`,
          isAutomated: true
        });
        iterDate.setMonth(iterDate.getMonth() + 1);
      }
    });

    // C. Payroll
    const payrolls = await prisma.payroll.findMany({
      include: { employee: true }
    });

    payrolls.forEach(p => {
      automatedItems.push({
        id: `AUTO_PAYROLL_${p.id}`,
        tenChiPhi: `Lương nhân sự: ${p.employee.fullName}`,
        loai: "exp-20260401-1372-fdyu", // Category for salaries
        soTien: p.tongChiPhiCty,
        ngayChiTra: new Date(p.nam, p.thang - 1, 25), // Assume 25th of month
        nguoiChiTra: "Hệ thống tự động",
        trangThai: p.trangThai === "da-tra" ? "paid" : "pending",
        ghiChu: `Tháng ${p.thang}/${p.nam} (Ngày công: ${p.ngayCong})`,
        isAutomated: true
      });
    });

    // 3. Combine and Filter
    let allItems = [...manualItems, ...automatedItems];

    // Filter automated items based on search/category/status if needed
    if (search || loai || trangThai || dateFrom || dateTo) {
      allItems = allItems.filter(item => {
        let match = true;
        if (search) match = match && item.tenChiPhi.toLowerCase().includes(search.toLowerCase());
        if (loai) match = match && item.loai === loai;
        if (trangThai) match = match && item.trangThai === trangThai;
        if (dateFrom) match = match && new Date(item.ngayChiTra) >= new Date(dateFrom);
        if (dateTo) match = match && new Date(item.ngayChiTra) <= new Date(dateTo + "T23:59:59");
        return match;
      });
    }

    // Sort by date descending
    allItems.sort((a, b) => new Date(b.ngayChiTra).getTime() - new Date(a.ngayChiTra).getTime());

    const total = allItems.length;
    const items = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (e: unknown) {
    console.error("[GET /expenses]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { tenChiPhi, loai, soTien, ngayChiTra, nguoiChiTra, trangThai, ghiChu } = body;
    if (!tenChiPhi?.trim())
      return NextResponse.json({ error: "Tên khoản chi không được để trống" }, { status: 400 });

    const item = await prisma.expense.create({
      data: {
        tenChiPhi:   tenChiPhi.trim(),
        loai:        loai ?? null,
        nguoiChiTra: nguoiChiTra ?? null,
        soTien:      parseFloat(soTien ?? 0),
        trangThai:   trangThai ?? "pending",
        ghiChu:      ghiChu   ?? null,
        ...(ngayChiTra && { ngayChiTra: new Date(ngayChiTra) }),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
