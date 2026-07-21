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

    const orders = await prisma.saleOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            dienThoai: true,
            loai: true,
            nhom: true
          }
        },
        saleOrderItems: true
      }
    });

    const totalOrdersCount = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + (o.tongTien || 0), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.daThanhToan || 0), 0);
    const totalDebt = Math.max(0, totalSales - totalRevenue);

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

    // 4. Group actual orders by month for the current year
    const monthlySalesMap: Record<number, number> = {};
    const monthlyRevenueMap: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      monthlySalesMap[m] = 0;
      monthlyRevenueMap[m] = 0;
    }

    orders.forEach(order => {
      if (order.ngayDat) {
        const orderDate = new Date(order.ngayDat);
        if (orderDate.getFullYear() === currentYear) {
          const month = orderDate.getMonth() + 1; // 1-indexed
          monthlySalesMap[month] += (order.tongTien || 0);
          monthlyRevenueMap[month] += (order.daThanhToan || 0);
        }
      }
    });

    // 5. Fetch Recent Customer Care History (from CRM PartnerCareHistory)
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

    // 6. Calculate category breakdown
    const allItemNames = [...new Set(orders.flatMap(o => o.saleOrderItems?.map((i: any) => i.tenHang)).filter(Boolean))];
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { tenHang: { in: allItemNames as string[] } },
      include: { category: true }
    });

    const itemNameToCategory: Record<string, string> = {};
    inventoryItems.forEach(item => {
      if (item.tenHang) {
        itemNameToCategory[item.tenHang] = item.category?.name || "Thiết bị khác";
      }
    });

    const categorySalesMap: Record<string, number> = {};
    orders.forEach(order => {
      if (order.saleOrderItems) {
        order.saleOrderItems.forEach((item: any) => {
          if (item.tenHang) {
            const catName = itemNameToCategory[item.tenHang] || "Thiết bị khác";
            categorySalesMap[catName] = (categorySalesMap[catName] || 0) + (item.thanhTien || 0);
          }
        });
      }
    });

    // Format top categories
    const sortedCategories = Object.entries(categorySalesMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Take top 4, aggregate rest into "Khác"
    let topCategories = sortedCategories.slice(0, 4);
    const restValue = sortedCategories.slice(4).reduce((sum, c) => sum + c.value, 0);
    if (restValue > 0) {
      topCategories.push({ name: "Khác", value: restValue });
    }
    // If empty, provide default mock
    if (topCategories.length === 0) {
      topCategories = [
        { name: "Thiết bị vệ sinh", value: 1890000000 },
        { name: "Sen vòi Seajong", value: 1260000000 },
        { name: "Phụ kiện", value: 675000000 }
      ];
    }

    const currentMonth = new Date().getMonth() + 1;
    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return {
        month: `Tháng ${month}`,
        target: monthlyTargetsMap[month],
        actualSales: month > currentMonth ? null : monthlySalesMap[month],
        actualRevenue: month > currentMonth ? null : monthlyRevenueMap[month]
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

    // 7. Calculate region breakdown
    const regionSalesMap = { "Miền Bắc": 0, "Miền Trung": 0, "Miền Nam": 0 };
    orders.forEach(order => {
      const address = (order.customer?.address || "").toLowerCase();
      const revenue = order.daThanhToan || 0;
      
      if (address.includes("hồ chí minh") || address.includes("hcm") || address.includes("sài gòn") || address.includes("cần thơ") || address.includes("bình dương") || address.includes("đồng nai") || address.includes("vũng tàu") || address.includes("long an")) {
        regionSalesMap["Miền Nam"] += revenue;
      } else if (address.includes("đà nẵng") || address.includes("huế") || address.includes("quảng nam") || address.includes("quảng ngãi") || address.includes("bình định") || address.includes("khánh hòa") || address.includes("nghệ an") || address.includes("thanh hóa")) {
        regionSalesMap["Miền Trung"] += revenue;
      } else if (revenue > 0) {
        // Default to Miền Bắc if there's revenue but no explicit matching
        regionSalesMap["Miền Bắc"] += revenue;
      }
    });
    
    // If absolutely no revenue, provide a mockup for testing purposes so chart isn't totally empty if testing empty DB
    if (regionSalesMap["Miền Bắc"] === 0 && regionSalesMap["Miền Trung"] === 0 && regionSalesMap["Miền Nam"] === 0) {
       regionSalesMap["Miền Bắc"] = 2340000000;
       regionSalesMap["Miền Trung"] = 810000000;
       regionSalesMap["Miền Nam"] = 1350000000;
    }

    const regionBreakdown = [
      { name: "Miền Bắc", value: regionSalesMap["Miền Bắc"] },
      { name: "Miền Trung", value: regionSalesMap["Miền Trung"] },
      { name: "Miền Nam", value: regionSalesMap["Miền Nam"] }
    ];

    return NextResponse.json({
      summary: {
        totalSales,
        totalRevenue,
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
