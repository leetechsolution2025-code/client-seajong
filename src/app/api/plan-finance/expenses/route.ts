import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 15;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search    = searchParams.get("search")    ?? "";
    const trangThai = searchParams.get("trangThai") ?? "";
    const loai      = searchParams.get("loai")      ?? "";
    const dateFrom  = searchParams.get("dateFrom")  ?? "";
    const dateTo    = searchParams.get("dateTo")    ?? "";

    const where = {
      ...(search    && { tenChiPhi: { contains: search } }),
      ...(trangThai && { trangThai }),
      ...(loai      && { loai }),
      ...(dateFrom || dateTo
        ? {
            ngayChiTra: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo   && { lte: new Date(dateTo + "T23:59:59") }),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (e: unknown) {
    console.error("[GET /expenses]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { tenChiPhi, loai, soTien, ngayChiTra, nguoiChiTra, trangThai, ghiChu } = body;
    if (!tenChiPhi?.trim())
      return NextResponse.json({ error: "Tên khoản chi không được để trống" }, { status: 400 });

    const item = await prisma.expense.create({
      data: {
        tenChiPhi:   tenChiPhi.trim(),
        loai:        loai ?? null,
        nguoiChiTra: nguoiChiTra ?? null,
        soTien:      parseFloat(soTien ?? 0),
        trangThai:   trangThai ?? "pending",
        ghiChu:      ghiChu   ?? null,
        ...(ngayChiTra && { ngayChiTra: new Date(ngayChiTra) }),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
