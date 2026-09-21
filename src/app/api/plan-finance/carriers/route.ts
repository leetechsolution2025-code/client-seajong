import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { carrierDb } from "@/lib/carrierDb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page        = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit       = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "15")));
    const search      = searchParams.get("search")?.trim() ?? "";
    const trangThai   = searchParams.get("trangThai")?.trim() ?? "";
    const serviceType = searchParams.get("serviceType")?.trim() ?? "";

    const where: any = {};
    if (trangThai) where.trangThai = trangThai;
    if (serviceType) where.serviceType = serviceType;
    if (search) where.search = search;

    const [total, items] = await Promise.all([
      carrierDb.count(where),
      carrierDb.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e: any) {
    console.error("[GET /api/plan-finance/carriers]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      name,
      serviceType,
      contactName,
      contactRole,
      phone,
      email,
      website,
      transactionAddress,
      address,
      routes,
      hanMucNo,
      danhGia,
      trangThai,
      ghiChu,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Tên đơn vị vận chuyển không được để trống" }, { status: 400 });
    }

    // Tự sinh mã VCH-YYYYMMDD-STT nếu không truyền
    let finalCode = body.code?.trim();
    if (!finalCode) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const prefix = `VCH-${yyyy}${mm}${dd}-`;

      const lastCode = await carrierDb.findLastCode(prefix);

      let seq = 1;
      if (lastCode) {
        const lastSeq = parseInt(lastCode.replace(prefix, ""), 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }
      finalCode = `${prefix}${String(seq).padStart(3, "0")}`;
    }

    const carrier = await carrierDb.create({
      code: finalCode,
      name: name.trim(),
      serviceType: serviceType?.trim() || "Chuyển phát nhanh",
      contactName: contactName?.trim() || null,
      contactRole: contactRole?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      website: website?.trim() || null,
      transactionAddress: transactionAddress?.trim() || null,
      address: address?.trim() || null,
      routes: routes?.trim() || null,
      hanMucNo: typeof hanMucNo === "number" ? hanMucNo : parseFloat(hanMucNo) || 0,
      danhGia: typeof danhGia === "number" ? danhGia : parseInt(danhGia, 10) || 5,
      trangThai: trangThai || "active",
      ghiChu: ghiChu?.trim() || null,
    });

    return NextResponse.json(carrier, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/plan-finance/carriers]", e);
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Mã đơn vị vận chuyển đã tồn tại" }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Lỗi tạo đơn vị vận chuyển" }, { status: 500 });
  }
}
