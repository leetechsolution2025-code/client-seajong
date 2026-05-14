import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search     = searchParams.get("search")     ?? "";
    const trangThai  = searchParams.get("trangThai")  ?? "";
    const uuTien     = searchParams.get("uuTien")     ?? "";
    const customerId = searchParams.get("customerId") ?? "";

    const where = {
      ...(customerId && { customerId }),
      ...(search    && { OR: [{ code: { contains: search } }, { customer: { name: { contains: search } } }] }),
      ...(trangThai && { trangThai }),
      ...(uuTien    && { uuTien }),
    };

    const [total, items] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: {
          customer:      { select: { id: true, name: true, dienThoai: true, email: true, address: true } },
          nguoiPhuTrach: { select: { id: true, fullName: true, position: true, userId: true } },
          items:         { orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    return NextResponse.json({
      items, total, page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (e: unknown) {
    console.error("[GET /quotations]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      code, customerId,
      ngayBaoGia, ngayHetHan,
      trangThai, uuTien,
      tongTien, discount, vat, thanhTien, ghiChu,
      items,
    } = body;

    // Tự động lấy employeeId của người tạo báo giá
    const creatorEmployee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const nguoiPhuTrachId = creatorEmployee?.id ?? null;

    const quotation = await prisma.$transaction(async (tx) => {
      // 1. Tạo báo giá
      const q = await tx.quotation.create({
        data: {
          code,
          trangThai: trangThai ?? "draft",
          uuTien:    uuTien    ?? "medium",
          tongTien:  parseFloat(tongTien  ?? 0),
          discount:  parseFloat(discount  ?? 0),
          vat:       parseFloat(vat       ?? 0),
          thanhTien: parseFloat(thanhTien ?? 0),
          ghiChu,
          ...(customerId      && { customerId }),
          ...(nguoiPhuTrachId && { nguoiPhuTrachId }),
          ...(ngayBaoGia      && { ngayBaoGia: new Date(ngayBaoGia) }),
          ...(ngayHetHan      && { ngayHetHan: new Date(ngayHetHan) }),
        },
      });

      // 2. Tạo các dòng hàng hoá (nếu có)
      if (Array.isArray(items) && items.length > 0) {
        await tx.quotationItem.createMany({
          data: items.map((it: {
            tenHang: string; donVi?: string;
            soLuong?: number; donGia?: number; thanhTien?: number;
            ghiChu?: string; sortOrder?: number;
          }, idx: number) => ({
            quotationId: q.id,
            tenHang:    it.tenHang ?? "",
            donVi:      it.donVi   ?? "cái",
            soLuong:    parseFloat(String(it.soLuong  ?? 1)),
            donGia:     parseFloat(String(it.donGia   ?? 0)),
            thanhTien:  parseFloat(String(it.thanhTien ?? 0)),
            ghiChu:     it.ghiChu  ?? null,
            sortOrder:  it.sortOrder ?? idx,
          })),
        });
      }

      return q;
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

