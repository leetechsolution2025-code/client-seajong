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
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search    = searchParams.get("search")    ?? "";
    const trangThai = searchParams.get("trangThai") ?? "";

    const where = {
      ...(search    && { OR: [{ code: { contains: search } }, { customer: { name: { contains: search } } }] }),
      ...(trangThai && { trangThai }),
    };

    const [total, items] = await Promise.all([
      prisma.saleOrder.count({ where }),
      prisma.saleOrder.findMany({
        where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { id: true, name: true } } },
      }),
    ]);

    return NextResponse.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (e: unknown) {
    console.error("[GET /sales]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { code, customerId, ngayDat, ngayGiao, trangThai, tongTien, daThanhToan, ghiChu, nguoiPhuTrach } = body;

    const item = await prisma.saleOrder.create({
      data: {
        code, trangThai: trangThai ?? "draft",
        tongTien:    parseFloat(tongTien    ?? 0),
        daThanhToan: parseFloat(daThanhToan ?? 0),
        ghiChu, nguoiPhuTrach,
        ...(customerId && { customerId }),
        ...(ngayDat    && { ngayDat: new Date(ngayDat) }),
        ...(ngayGiao   && { ngayGiao: new Date(ngayGiao) }),
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
