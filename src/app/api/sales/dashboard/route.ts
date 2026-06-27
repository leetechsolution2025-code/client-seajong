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

    // 1. Fetch Sales Orders summary
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
        }
      }
    });

    const totalOrdersCount = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.tongTien || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + (o.daThanhToan || 0), 0);
    const totalDebt = Math.max(0, totalRevenue - totalPaid);

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
    const monthlyActualMap: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      monthlyActualMap[m] = 0;
    }

    orders.forEach(order => {
      if (order.ngayDat) {
        const orderDate = new Date(order.ngayDat);
        if (orderDate.getFullYear() === currentYear) {
          const month = orderDate.getMonth() + 1; // 1-indexed
          monthlyActualMap[month] += (order.tongTien || 0);
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

    // 6. Format monthly trend array
    const currentMonth = new Date().getMonth() + 1;
    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return {
        month: `Tháng ${month}`,
        target: monthlyTargetsMap[month],
        actual: month > currentMonth ? null : monthlyActualMap[month]
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

    return NextResponse.json({
      summary: {
        totalRevenue,
        targetRevenue,
        totalOrdersCount,
        totalDebt,
        customersCount,
        dealersCount
      },
      monthlyTrends,
      recentOrders,
      recentCare
    });
  } catch (err: any) {
    console.error("Sales dashboard error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
