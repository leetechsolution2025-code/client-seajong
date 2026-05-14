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
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: {
          customer:     { select: { id: true, name: true } },
          nguoiPhuTrach:{ select: { id: true, fullName: true } },
          quotation:    { select: { id: true, code: true } },
        },
      }),
    ]);

    return NextResponse.json({
      items, total, page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (e: unknown) {
    console.error("[GET /contracts]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      code, customerId, nguoiPhuTrachId, quotationId,
      ngayKy, ngayBatDau, ngayKetThuc,
      trangThai, uuTien,
      giaTriHopDong, daThanhToan, ghiChu,
    } = body;

    const item = await prisma.contract.create({
      data: {
        code,
        trangThai:     trangThai ?? "pending",
        uuTien:        uuTien    ?? "medium",
        giaTriHopDong: parseFloat(giaTriHopDong ?? 0),
        daThanhToan:   parseFloat(daThanhToan   ?? 0),
        ghiChu,
        ...(customerId      && { customerId }),
        ...(nguoiPhuTrachId && { nguoiPhuTrachId }),
        ...(quotationId     && { quotationId }),
        ...(ngayKy          && { ngayKy:      new Date(ngayKy) }),
        ...(ngayBatDau      && { ngayBatDau:  new Date(ngayBatDau) }),
        ...(ngayKetThuc     && { ngayKetThuc: new Date(ngayKetThuc) }),
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
