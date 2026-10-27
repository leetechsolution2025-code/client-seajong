export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseGuestInfo(ghiChu: string | null | undefined): { name: string; dienThoai: string; address: string } | null {
  if (!ghiChu) return null;
  const match = ghiChu.match(/\[GuestInfo:(.*?)\]/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentYear = new Date().getFullYear();

    const dbOrders = await prisma.saleOrder.findMany({
      where: {
        trangThai: { notIn: ["draft", "cancelled"] }
      },
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            dienThoai: true,
            loai: true,
            nhom: true,
            address: true
          }
        },
        saleOrderItems: true
      }
    });

    const orders = dbOrders.filter(order => {
      const orderDate = order.ngayDat ? new Date(order.ngayDat) : new Date(order.createdAt);
      return orderDate.getFullYear() === currentYear;
    });

    const totalOrdersCount = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + (o.tongTien || 0), 0);
    const paidFromOrders = orders.reduce((sum, o) => sum + (o.daThanhToan || 0), 0);

    // Tính thêm tiền thực thu từ phiếu thu công nợ khách hàng trong năm
    let paidFromDebts = 0;
    try {
      const debtReceipts = await prisma.debt.findMany({
        where: {
          type: { in: ["phai-thu", "RECEIVABLE"] },
          paidAmount: { gt: 0 }
        },
        select: { paidAmount: true, createdAt: true, referenceId: true }
      });
      const validYearDebtReceipts = debtReceipts.filter(d => {
        const dDate = new Date(d.createdAt);
        return dDate.getFullYear() === currentYear && (d.referenceId?.startsWith("PT-") || d.referenceId?.startsWith("PAY-"));
      });
      paidFromDebts = validYearDebtReceipts.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
    } catch (e) {}

    const totalCollected = Math.max(paidFromOrders, paidFromDebts);
    const totalRevenue = totalSales; // Doanh thu ghi nhận theo đơn hàng để đối sánh KPI
    const totalDebt = Math.max(0, totalSales - totalCollected);

    // 2. Fetch Customers summary (from CRM MarketingLead)
    const leadsForCount = await (prisma as any).marketingLead.findMany({
      select: { formValues: true }
    });
    const customersCount = leadsForCount.length;
    let dealersCount = 0;
    leadsForCount.forEach((l: any) => {
      if (l.formValues) {
        try {
          const parsed = JSON.parse(l.formValues);
          if (parsed.step === 5) {
            dealersCount++;
          }
        } catch (e) {}
      }
    });

    // 3. Fetch current year Sales Plan targets
    const yearlyPlan = await prisma.salesYearlyPlan.findUnique({
      where: { year: currentYear }
    });

    let targetRevenue = 0;
    const monthlyTargetsMap: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      monthlyTargetsMap[m] = 0;
    }

    if (yearlyPlan) {
      try {
        const planRowsList = JSON.parse(yearlyPlan.planRows || "[]");
        const totalRow = planRowsList.find((r: any) => r.stt === "1");
        targetRevenue = totalRow?.target || 0;

        if (yearlyPlan.monthlyTargets) {
          const monthlyTargetsData = JSON.parse(yearlyPlan.monthlyTargets);
          for (let m = 1; m <= 12; m++) {
            const mData = monthlyTargetsData[m];
            if (mData?.revenueRows) {
              // Sum all revenue categories for this month
              const mTotal = mData.revenueRows.reduce((sum: number, r: any) => sum + (r.value || 0), 0);
              monthlyTargetsMap[m] = mTotal;
            }
          }
        }
      } catch (e) {
        console.error("Error parsing yearly plan rows:", e);
      }
    }

    // 4. Lấy thông tin hàng hoá để phân loại Brand (Seajong vs OEM/Khác) & Danh mục
    const allItemNames = [...new Set(orders.flatMap(o => o.saleOrderItems?.map((i: any) => i.tenHang)).filter(Boolean))];
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { tenHang: { in: allItemNames as string[] } },
      select: {
        id: true,
        tenHang: true,
        brand: true,
        category: { select: { id: true, name: true } }
      }
    });

    const itemNameToCategory: Record<string, string> = {};
    const itemNameToBrand: Record<string, string> = {};
    inventoryItems.forEach(item => {
      if (item.tenHang) {
        itemNameToCategory[item.tenHang] = item.category?.name || "Thiết bị khác";
        itemNameToBrand[item.tenHang] = item.brand || "Seajong";
      }
    });

    // 5. Group actual orders by month for the current year
    const monthlySalesMap: Record<number, number> = {};
    const monthlySeajongMap: Record<number, number> = {};
    const monthlyOtherMap: Record<number, number> = {};
    const monthlyRevenueMap: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      monthlySalesMap[m] = 0;
      monthlySeajongMap[m] = 0;
      monthlyOtherMap[m] = 0;
      monthlyRevenueMap[m] = 0;
    }

    orders.forEach(order => {
      const orderDate = order.ngayDat ? new Date(order.ngayDat) : new Date(order.createdAt);
      const month = orderDate.getMonth() + 1; // 1-indexed
      const orderTotal = order.tongTien || 0;
      monthlySalesMap[month] += orderTotal;
      monthlyRevenueMap[month] += (order.daThanhToan || 0);

      // Phân tách doanh số Seajong vs Hàng khác trong đơn hàng
      const items = order.saleOrderItems || [];
      const itemsTotal = items.reduce((s: number, it: any) => s + (it.thanhTien || 0), 0);
      let orderSeajongItems = 0;

      items.forEach((it: any) => {
        const b = (itemNameToBrand[it.tenHang] || "").toLowerCase();
        const t = (it.tenHang || "").toLowerCase();
        const isSeajong = b === "seajong" || t.includes("seajong") || t.includes("sj-") || (!b && !t.includes("oem") && !t.includes("voriger"));
        if (isSeajong) {
          orderSeajongItems += (it.thanhTien || 0);
        }
      });

      let seajongAmt = 0;
      if (itemsTotal > 0) {
        seajongAmt = Math.round((orderSeajongItems / itemsTotal) * orderTotal);
      } else {
        seajongAmt = orderTotal;
      }
      const otherAmt = Math.max(0, orderTotal - seajongAmt);

      monthlySeajongMap[month] += seajongAmt;
      monthlyOtherMap[month] += otherAmt;
    });

    // 6. Fetch Recent Customer Care History (from CRM PartnerCareHistory)
    const dbRecentCare = await (prisma as any).partnerCareHistory.findMany({
      take: 5,
      orderBy: { executionDate: "desc" },
      include: {
        partner: {
          select: {
            id: true,
            fullName: true,
            formValues: true
          }
        }
      }
    });

    const recentCare = dbRecentCare.map((c: any) => {
      let businessType = "Đối tác";
      if (c.partner?.formValues) {
        try {
          const parsed = JSON.parse(c.partner.formValues);
          if (parsed.detailBusinessType) {
            businessType = parsed.detailBusinessType;
          }
        } catch (e) {}
      }
      return {
        id: c.id,
        customerId: c.partnerId,
        ngayChamSoc: c.executionDate.toISOString(),
        hinhThuc: c.approachStep || "Chăm sóc",
        tomTat: c.otherRequirements || c.collabNeeds || "Chăm sóc định kỳ",
        customer: {
          id: c.partnerId,
          name: c.partner?.fullName || c.fullName || "Đại lý",
          loai: businessType
        },
        nguoiChamSoc: {
          id: c.executor,
          fullName: c.executor || "Nhân viên"
        }
      };
    });

    // 7. Calculate category breakdown
    // Map to exactly 4 buckets as requested: Thiết bị vệ sinh, Thiết bị nhà bếp, Phụ kiện, Loại khác
    const predefinedBuckets: Record<string, number> = {
      "Thiết bị vệ sinh": 0,
      "Thiết bị nhà bếp": 0,
      "Phụ kiện": 0,
      "Loại khác": 0,
    };

    orders.forEach(order => {
      if (order.saleOrderItems) {
        order.saleOrderItems.forEach((item: any) => {
          if (item.tenHang) {
            const rawCatName = itemNameToCategory[item.tenHang] || "Loại khác";
            const lowerCat = rawCatName.toLowerCase();
            const lowerItem = item.tenHang.toLowerCase();
            const revenue = item.thanhTien || 0;
            
            if (
              lowerCat.includes("vệ sinh") || lowerItem.includes("vệ sinh") || 
              lowerCat.includes("sen") || lowerItem.includes("sen") || 
              lowerCat.includes("bàn cầu") || lowerItem.includes("bàn cầu") || 
              lowerItem.includes("bồn cầu") || 
              lowerCat.includes("lavabo") || lowerItem.includes("lavabo") ||
              lowerItem.includes("bồn tắm") || lowerItem.includes("chậu")
            ) {
              predefinedBuckets["Thiết bị vệ sinh"] += revenue;
            } else if (
              lowerCat.includes("bếp") || lowerItem.includes("bếp") || 
              lowerCat.includes("hút mùi") || lowerItem.includes("hút mùi")
            ) {
              predefinedBuckets["Thiết bị nhà bếp"] += revenue;
            } else if (
              lowerCat.includes("phụ kiện") || lowerItem.includes("phụ kiện") || 
              lowerCat.includes("gương") || lowerItem.includes("gương") || 
              lowerCat.includes("vòi xịt") || lowerItem.includes("vòi xịt")
            ) {
              predefinedBuckets["Phụ kiện"] += revenue;
            } else {
              predefinedBuckets["Loại khác"] += revenue;
            }
          }
        });
      }
    });

    let topCategories = [
      { name: "Thiết bị vệ sinh", value: predefinedBuckets["Thiết bị vệ sinh"] },
      { name: "Thiết bị nhà bếp", value: predefinedBuckets["Thiết bị nhà bếp"] },
      { name: "Phụ kiện", value: predefinedBuckets["Phụ kiện"] },
      { name: "Loại khác", value: predefinedBuckets["Loại khác"] },
    ];

    const totalCatValue = topCategories.reduce((sum, c) => sum + c.value, 0);
    if (totalCatValue === 0) {
      topCategories = []; // Return empty if no valid revenue
    }

    const currentMonth = new Date().getMonth() + 1;
    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const sales = monthlySalesMap[month] || 0;
      const seajong = monthlySeajongMap[month] || 0;
      const other = monthlyOtherMap[month] || 0;
      const rev = monthlyRevenueMap[month] || 0;
      return {
        month: `Tháng ${month}`,
        target: monthlyTargetsMap[month],
        actualSales: month > currentMonth ? null : sales,
        actualRevenue: month > currentMonth ? null : rev,
        actual: month > currentMonth ? null : sales, // Doanh số thực tế đạt được để đối sánh với KPI
        seajongSales: month > currentMonth ? null : seajong,
        otherSales: month > currentMonth ? null : other,
      };
    });

    const recentOrders = orders.slice(0, 5).map(o => {
      const guest = parseGuestInfo(o.ghiChu);
      let customerName = "Khách vãng lai";
      if (o.customer?.name) {
        customerName = o.customer.name;
      } else if (guest) {
        customerName = guest.name + (guest.dienThoai ? ` - ${guest.dienThoai}` : "");
      }
      return {
        id: o.id,
        code: o.code || `SO-${o.id.slice(-6).toUpperCase()}`,
        customerName,
        ngayDat: o.ngayDat,
        tongTien: o.tongTien,
        trangThai: o.trangThai,
        daThanhToan: o.daThanhToan
      };
    });

    // 7. Calculate region breakdown based on actual order sales
    const regionSalesMap = { "Miền Bắc": 0, "Miền Trung": 0, "Miền Nam": 0 };
    orders.forEach(order => {
      const address = (order.customer?.address || "").toLowerCase();
      const amount = order.tongTien || 0;
      if (amount <= 0) return;
      
      if (address.includes("hồ chí minh") || address.includes("hcm") || address.includes("sài gòn") || address.includes("cần thơ") || address.includes("bình dương") || address.includes("đồng nai") || address.includes("vũng tàu") || address.includes("long an") || address.includes("củ chi")) {
        regionSalesMap["Miền Nam"] += amount;
      } else if (address.includes("đà nẵng") || address.includes("huế") || address.includes("quảng nam") || address.includes("quảng ngãi") || address.includes("bình định") || address.includes("khánh hòa") || address.includes("nghệ an") || address.includes("thanh hóa") || address.includes("hà tĩnh")) {
        regionSalesMap["Miền Trung"] += amount;
      } else {
        // Miền Bắc (Hà Nội, Bắc Ninh, Từ Sơn,...) hoặc khách hàng nội bộ
        regionSalesMap["Miền Bắc"] += amount;
      }
    });

    const regionBreakdown = [
      { name: "Miền Bắc", value: regionSalesMap["Miền Bắc"] },
      { name: "Miền Trung", value: regionSalesMap["Miền Trung"] },
      { name: "Miền Nam", value: regionSalesMap["Miền Nam"] }
    ];

    return NextResponse.json({
      summary: {
        totalSales,
        totalRevenue,
        totalCollected,
        targetRevenue,
        totalOrdersCount,
        totalDebt,
        customersCount,
        dealersCount
      },
      monthlyTrends,
      categoryBreakdown: topCategories,
      regionBreakdown,
      recentOrders,
      recentCare
    });
  } catch (err: any) {
    console.error("Sales dashboard error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
