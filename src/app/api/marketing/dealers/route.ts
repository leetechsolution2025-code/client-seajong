import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Hàm xác định vùng miền từ chuỗi địa chỉ
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
    "an giang", "kiên giang", "cần thơ", "hậu giang", "sóc trăng", "bạc liêu", "cà mau"
  ];

  if (mienBac.some(k => addr.includes(k))) return "Miền Bắc";
  if (mienTrung.some(k => addr.includes(k))) return "Miền Trung";
  if (mienNam.some(k => addr.includes(k))) return "Miền Nam";

  return "Toàn quốc";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "10", 10)));
    const tierFilter = searchParams.get("tier")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";
    const regionFilter = searchParams.get("region")?.trim() || "";

    // Lọc theo Customer (nhom: dai-ly hoặc tất cả khách hàng đại lý)
    const baseWhere: any = {
      OR: [
        { nhom: "dai-ly" },
        { loai: { contains: "dai-ly" } },
        { nhom: null }
      ]
    };

    if (search) {
      baseWhere.AND = [
        {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { dienThoai: { contains: search } },
            { address: { contains: search } },
            { daiDien: { contains: search } },
            { email: { contains: search } },
          ]
        }
      ];
    }

    const [totalCount, customers] = await Promise.all([
      prisma.customer.count({ where: baseWhere }),
      prisma.customer.findMany({
        where: baseWhere,
        include: {
          saleOrders: {
            where: { trangThai: { not: "cancelled" } },
            select: { tongTien: true }
          },
          contracts: {
            select: { giaTriHopDong: true }
          },
          debts: {
            select: { amount: true, paidAmount: true, status: true, dueDate: true }
          }
        },
        orderBy: [
          { createdAt: "desc" }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    // Format danh sách đại lý chuẩn theo UI
    const dealers = customers.map((c, index) => {
      const region = parseRegion(c.address);
      const code = c.code || `DL-${String((page - 1) * pageSize + index + 1).padStart(3, '0')}`;
      
      // Tính doanh thu thực tế từ SaleOrders hoặc Contracts
      const orderRevenue = c.saleOrders.reduce((sum, o) => sum + (o.tongTien || 0), 0);
      const contractRevenue = c.contracts.reduce((sum, ct) => sum + (ct.giaTriHopDong || 0), 0);
      
      // Doanh thu thực tế và chỉ tiêu target
      let revenue = orderRevenue > 0 ? orderRevenue : contractRevenue;
      let target = c.doanhSoCamKet > 0 ? c.doanhSoCamKet : 0;

      // Nếu cả revenue và target = 0 thì căn cứ theo hạn mức hoặc định mức đại lý
      if (revenue === 0 && c.hanMucCongNo > 0) {
        revenue = c.hanMucCongNo;
        target = c.hanMucCongNo * 1.5;
      }

      if (target === 0) {
        target = revenue > 0 ? revenue * 1.2 : 5000000000;
      }

      // Xác định cấp bậc (Tier)
      let tier = "Bronze";
      const maxVal = Math.max(revenue, target);
      if (maxVal >= 10000000000) {
        tier = "Platinum";
      } else if (maxVal >= 6000000000) {
        tier = "Gold";
      } else if (maxVal >= 2000000000) {
        tier = "Silver";
      } else {
        tier = "Bronze";
      }

      // Xác định trạng thái
      const now = new Date();
      const hasOverdueDebt = c.debts.some(d => {
        const remaining = (d.amount || 0) - (d.paidAmount || 0);
        const isPastDue = d.dueDate ? new Date(d.dueDate) < now : false;
        return remaining > 0 && (d.status === "overdue" || isPastDue);
      });
      const status = hasOverdueDebt ? "Warning" : "Active";

      return {
        id: c.id,
        code,
        name: c.name,
        region,
        address: c.address || "",
        phone: c.dienThoai || c.daiDien || "Chưa có SĐT",
        email: c.email || "",
        tier,
        revenue,
        target,
        status,
        representative: c.daiDien || "",
        debtLimit: c.hanMucCongNo || 0
      };
    });

    // Lọc theo tier/status/region nếu được yêu cầu trên trang hiện tại
    let filteredDealers = dealers;
    if (tierFilter) {
      filteredDealers = filteredDealers.filter(d => d.tier.toLowerCase() === tierFilter.toLowerCase());
    }
    if (statusFilter) {
      filteredDealers = filteredDealers.filter(d => d.status.toLowerCase() === statusFilter.toLowerCase());
    }
    if (regionFilter) {
      filteredDealers = filteredDealers.filter(d => d.region.toLowerCase().includes(regionFilter.toLowerCase()));
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      dealers: filteredDealers,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.max(1, totalPages)
      }
    });
  } catch (error: any) {
    console.error("[Marketing Dealers GET Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, address, region, tier, debtLimit, committedSales, email, representative } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tên đại lý là bắt buộc" }, { status: 400 });
    }

    // Đếm tổng để sinh mã KH/DL
    const count = await prisma.customer.count();
    const code = `DL-${String(count + 1).padStart(4, '0')}`;

    const newCustomer = await prisma.customer.create({
      data: {
        code,
        name: name.trim(),
        dienThoai: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        email: email ? email.trim() : null,
        daiDien: representative ? representative.trim() : null,
        nhom: "dai-ly",
        loai: "lkh-20260401-1090-xqah",
        hanMucCongNo: debtLimit ? Number(debtLimit) : 0,
        doanhSoCamKet: committedSales ? Number(committedSales) : 0,
      }
    });

    return NextResponse.json({
      success: true,
      dealer: newCustomer
    });
  } catch (error: any) {
    console.error("[Marketing Dealers POST Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

