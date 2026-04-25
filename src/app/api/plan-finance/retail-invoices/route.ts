import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET — danh sách hoá đơn ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit     = 20;
  const search    = searchParams.get("search") ?? "";
  const trangThai = searchParams.get("trangThai") ?? "";

  const baseWhere = {
    ...(search && {
      OR: [
        { code:      { contains: search } },
        { tenKhach:  { contains: search } },
        { dienThoai: { contains: search } },
      ],
    }),
  };

  const where = {
    ...baseWhere,
    ...(trangThai && { trangThai }),
  };

  // Fetch categories để lấy danh sách mã trạng thái
  const statuses = await prisma.category.findMany({
    where: { type: "tr_ng_th_i_ho_n_b_n_l_", isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, color: true },
  });

  // Đếm theo từng trạng thái
  const countsByStatus = await Promise.all(
    statuses.map(s => prisma.retailInvoice.count({ where: { ...baseWhere, trangThai: s.code } }))
  );

  const [items, total, allCount] = await Promise.all([
    prisma.retailInvoice.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.retailInvoice.count({ where }),
    prisma.retailInvoice.count({ where: baseWhere }),
  ]);

  const statusCounts = {
    all: allCount,
    byStatus: statuses.map((s, i) => ({ code: s.code, name: s.name, color: s.color, count: countsByStatus[i] })),
  };

  return NextResponse.json({
    items, total, page,
    totalPages: Math.ceil(total / limit),
    statusCounts,
  });
}

// ── POST — tạo hoá đơn mới ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tenKhach, dienThoai, diaChi, lines, chietKhau, vat, hinhThucTT, tienKhachDua, tienThua, ghiChu } = body;

  if (!lines || lines.length === 0)
    return NextResponse.json({ error: "Cần ít nhất 1 sản phẩm" }, { status: 400 });

  // Tính tiền
  const tongTien = lines.reduce((s: number, l: { qty: number; donGia: number }) => s + l.qty * l.donGia, 0);
  const discAmt  = tongTien * (chietKhau ?? 0) / 100;
  const vatAmt   = (tongTien - discAmt) * (vat ?? 0) / 100;
  const tongCong = tongTien - discAmt + vatAmt;
  const traNgay  = Math.min(tienKhachDua ?? 0, tongCong);
  const conNo    = Math.max(0, tongCong - traNgay);

  // Auto code
  const now   = new Date();
  const ymd   = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const count = await prisma.retailInvoice.count();
  const code  = `HDL-${ymd}-${String(count + 1).padStart(3, "0")}`;

  // Tạo hoá đơn + (nếu còn nợ) tạo bản ghi Debt trong transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.retailInvoice.create({
      data: {
        code,
        tenKhach:     tenKhach  || null,
        dienThoai:    dienThoai || null,
        diaChi:       diaChi    || null,
        tongTien,
        chietKhau:    chietKhau ?? 0,
        vat:          vat ?? 0,
        tongCong,
        hinhThucTT:   hinhThucTT ?? "cash",
        tienKhachDua: traNgay,
        tienThua:     tienThua ?? 0,
        conNo,
        ghiChu:       ghiChu || null,
        trangThai:    conNo > 0 ? "con-cong-no" : "chua-xuat-hang",
        items: {
          create: (lines as Array<{ inventoryItemId?: string; name: string; dvt: string; qty: number; donGia: number }>).map(l => ({
            inventoryItemId: l.inventoryItemId || null,
            tenHang:   l.name,
            dvt:       l.dvt,
            soLuong:   l.qty,
            donGia:    l.donGia,
            thanhTien: l.qty * l.donGia,
          })),
        },
      },
      include: { items: true },
    });

    // Tự động tạo bản ghi Debt nếu khách còn nợ
    if (conNo > 0) {
      const doiTuong = tenKhach
        ? `${tenKhach}${dienThoai ? " – " + dienThoai : ""}`
        : `Khách lẻ – HĐ ${code}`;
      await tx.debt.create({
        data: {
          loai:      "phai-thu",
          doiTuong,
          soTien:    conNo,
          daThu:     0,
          trangThai: "chua-thu",
          ghiChu:    `Nợ hoá đơn bán lẻ ${code}${ghiChu ? " — " + ghiChu : ""}`,
        },
      });
    }

    return inv;
  });

  return NextResponse.json(invoice, { status: 201 });
}
