import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseRegion(address?: string | null): string {
  if (!address) return "Toàn quốc";
  const addr = address.toLowerCase();

  const mienBac = [
    "hà nội", "ha noi", "hải phòng", "hai phong", "hải dương", "hưng yên", "bắc ninh", "bac ninh", "bắc giang",
    "quảng ninh", "nam định", "thái bình", "ninh bình", "hà nam", "vĩnh phúc", "phú thọ", "thái nguyên",
    "tuyên quang", "lào cai", "lao cai", "yên bái", "lạng sơn", "cao bằng", "hà giang", "bắc kạn", "sơn la", "điện biên",
    "lai châu", "hòa bình", "hoa binh", "đan phượng", "hà đông", "ha dong", "thường tín", "tây tựu", "tây hồ", "sơn tây"
  ];

  const mienTrung = [
    "thanh hóa", "thanh hoá", "nghệ an", "vinh", "hà tĩnh", "quảng bình", "quảng trị", "huế",
    "đà nẵng", "da nang", "quảng nam", "quảng ngãi", "bình định", "phú yên", "khánh hòa", "khánh hoà",
    "nha trang", "ninh thuận", "bình thuận", "kon tum", "gia lai", "đắk lắk", "dak lak", "đaklak", "daklak", "đắk nông", "lâm đồng"
  ];

  const mienNam = [
    "hồ chí minh", "tp hcm", "tphcm", "sài gòn", "bình dương", "đồng nai", "vũng tàu", "bà rịa",
    "tây ninh", "bình phước", "long an", "tiền giang", "bến tre", "trà vinh", "vĩnh long", "đồng tháp",
    "an giang", "kiên giang", "cần thơ", "hậu giang", "sóc trăng", "bạc liêu", "cà mau", "củ chi"
  ];

  if (mienBac.some(k => addr.includes(k))) return "Miền Bắc";
  if (mienTrung.some(k => addr.includes(k))) return "Miền Trung";
  if (mienNam.some(k => addr.includes(k))) return "Miền Nam";

  return "Toàn quốc";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedYear = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // 1. Tổng số đại lý & số đại lý mới trong tháng hiện tại và tháng trước
    const startOfCurMonth = new Date(currentYear, currentMonth - 1, 1);
    const startOfLastMonth = new Date(currentYear, currentMonth - 2, 1);

    const [totalDealers, newDealersThisMonth, newDealersLastMonth] = await Promise.all([
      prisma.customer.count({
        where: {
          OR: [
            { nhom: "dai-ly" },
            { nhom: "dai_ly" },
            { loai: { contains: "dai-ly" } }
          ]
        }
      }),
      prisma.customer.count({
        where: {
          AND: [
            {
              OR: [
                { nhom: "dai-ly" },
                { nhom: "dai_ly" },
                { loai: { contains: "dai-ly" } }
              ]
            },
            {
              createdAt: {
                gte: startOfCurMonth,
                lt: new Date(currentYear, currentMonth, 1)
              }
            }
          ]
        }
      }),
      prisma.customer.count({
        where: {
          AND: [
            {
              OR: [
                { nhom: "dai-ly" },
                { nhom: "dai_ly" },
                { loai: { contains: "dai-ly" } }
              ]
            },
            {
              createdAt: {
                gte: startOfLastMonth,
                lt: startOfCurMonth
              }
            }
          ]
        }
      })
    ]);

    // 2. Doanh thu theo 12 tháng từ SaleOrders và RetailInvoices của năm được chọn
    const [saleOrders, retailInvoices] = await Promise.all([
      prisma.saleOrder.findMany({
        where: {
          trangThai: { not: "cancelled" }
        },
        include: {
          customer: {
            select: { id: true, name: true, address: true, code: true, nhom: true, doanhSoCamKet: true, hanMucCongNo: true, formValues: true }
          }
        }
      }),
      prisma.retailInvoice.findMany({
        where: {
          trangThai: { not: "cancelled" }
        }
      })
    ]);

    const monthlyDealerRevenue = Array(12).fill(0);
    const monthlyRetailRevenue = Array(12).fill(0);
    const monthlyTotalRevenue = Array(12).fill(0);
    const dealerRevenueMap = new Map<string, { id: string; name: string; address: string; region: string; revenue: number; target: number }>();

    // Phân loại SaleOrders
    saleOrders.forEach(o => {
      const orderDate = o.ngayDat ? new Date(o.ngayDat) : new Date(o.createdAt);
      if (orderDate.getFullYear() === selectedYear) {
        const m = orderDate.getMonth(); // 0 - 11
        const amount = o.tongTien || 0;

        const isDealer = o.customer?.nhom === "dai-ly" || o.customer?.nhom === "dai_ly";
        if (isDealer) {
          monthlyDealerRevenue[m] += amount;
        } else {
          monthlyRetailRevenue[m] += amount;
        }

        if (o.customer && isDealer) {
          let addr = o.customer.address || "";
          if (!addr && o.customer.formValues) {
            try {
              const fv = JSON.parse(o.customer.formValues);
              addr = fv.detailBusinessAddress || fv.address || "";
            } catch (e) {}
          }

          const prev = dealerRevenueMap.get(o.customer.id) || {
            id: o.customer.id,
            name: o.customer.name,
            address: addr,
            region: parseRegion(addr),
            revenue: 0,
            target: o.customer.doanhSoCamKet || 0
          };
          prev.revenue += amount;
          dealerRevenueMap.set(o.customer.id, prev);
        }
      }
    });

    // Phân loại RetailInvoices
    retailInvoices.forEach(r => {
      const invDate = r.createdAt ? new Date(r.createdAt) : new Date();
      if (invDate.getFullYear() === selectedYear) {
        const m = invDate.getMonth();
        const amount = r.tongCong || 0;
        monthlyRetailRevenue[m] += amount;
      }
    });

    // Tổng hợp doanh thu toàn bộ
    for (let i = 0; i < 12; i++) {
      monthlyTotalRevenue[i] = monthlyDealerRevenue[i] + monthlyRetailRevenue[i];
    }

    // Lấy thêm các đại lý có doanh số cam kết hoặc hạn mức nếu chưa có đơn hàng
    const allCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { nhom: "dai-ly" },
          { nhom: "dai_ly" },
          { loai: { contains: "dai-ly" } }
        ]
      },
      select: { id: true, name: true, address: true, doanhSoCamKet: true, hanMucCongNo: true, formValues: true }
    });

    let totalCommitted = 0;
    allCustomers.forEach(c => {
      let fv: any = {};
      try { if (c.formValues) fv = JSON.parse(c.formValues); } catch (e) {}
      const target = c.doanhSoCamKet > 0 ? c.doanhSoCamKet : (fv.doanhSoCamKet || 0);
      totalCommitted += target;

      if (!dealerRevenueMap.has(c.id)) {
        let addr = c.address || "";
        if (!addr && fv) {
          addr = fv.detailBusinessAddress || fv.address || "";
        }

        dealerRevenueMap.set(c.id, {
          id: c.id,
          name: c.name,
          address: addr,
          region: parseRegion(addr),
          revenue: 0,
          target: target > 0 ? target : (c.hanMucCongNo > 0 ? c.hanMucCongNo * 2 : 0)
        });
      }
    });

    // Sắp xếp đại lý theo doanh thu thực tế giảm dần
    const sortedDealers = Array.from(dealerRevenueMap.values())
      .sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        return (b.target || 0) - (a.target || 0);
      });

    const topDealers = sortedDealers.slice(0, 5);

    // Tính doanh thu tháng hiện tại và tháng trước (theo doanh thu Đại lý)
    const curIdx = currentMonth - 1;
    const currentMonthRevenue = monthlyDealerRevenue[curIdx] || 0;
    const lastMonthRevenue = curIdx > 0 ? monthlyDealerRevenue[curIdx - 1] : 0;

    let growthRate = 0;
    if (lastMonthRevenue > 0) {
      growthRate = Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
    } else if (currentMonthRevenue > 0) {
      growthRate = 100;
    }

    // Tỷ lệ đạt target toàn hệ thống (Doanh thu thực tế đại lý lũy kế / Tổng cam kết năm)
    const totalYearRevenue = monthlyDealerRevenue.reduce((sum, v) => sum + v, 0);
    const targetRate = totalCommitted > 0 ? Math.min(100, Math.round((totalYearRevenue / totalCommitted) * 100)) : 0;

    // 3. Tickets hỗ trợ từ DealerSupportTicket trong DB
    const dealerTickets = await prisma.dealerSupportTicket.findMany({
      include: {
        customer: {
          select: { id: true, name: true, address: true, dienThoai: true }
        },
        handler: {
          select: { id: true, fullName: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const formattedTickets = dealerTickets.map(t => ({
      id: t.id,
      code: t.code,
      customerId: t.customerId,
      dealer: t.customer?.name || t.dealerName || "Hệ thống Seajong",
      address: t.customer?.address || "",
      type: t.type,
      title: t.title,
      content: t.content,
      status: t.status,
      date: new Date(t.requestDate || t.createdAt).toLocaleDateString("vi-VN"),
      handlerName: t.handler?.fullName || "",
      createdAt: t.createdAt
    }));

    const pendingTicketsCount = dealerTickets.filter(t => t.status === "In Progress" || t.status === "Pending").length;

    // Chuẩn bị dữ liệu series cho biểu đồ 12 tháng (những tháng tương lai để null để biểu đồ ngắt đúng tháng hiện tại)
    const chartTotalData = monthlyTotalRevenue.map((val, idx) => {
      if (idx > curIdx && selectedYear === currentYear) return null;
      return val;
    });

    const chartDealerData = monthlyDealerRevenue.map((val, idx) => {
      if (idx > curIdx && selectedYear === currentYear) return null;
      return val;
    });

    return NextResponse.json({
      kpi: {
        totalDealers,
        newDealersThisMonth,
        newDealersLastMonth,
        currentMonth,
        currentMonthRevenue,
        lastMonthRevenue,
        growthRate,
        targetRate,
        totalCommitted,
        totalYearRevenue,
        totalTickets: dealerTickets.length,
        pendingTickets: pendingTicketsCount
      },
      chart: {
        year: selectedYear,
        series: [
          {
            name: "Tổng doanh thu",
            data: chartTotalData,
            color: "#dc2626",
            type: "line"
          },
          {
            name: "Doanh thu qua Đại lý",
            data: chartDealerData,
            color: "#3b82f6",
            type: "area"
          }
        ]
      },
      topDealers,
      tickets: formattedTickets
    });
  } catch (error: any) {
    console.error("[Dashboard Dealers API Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
