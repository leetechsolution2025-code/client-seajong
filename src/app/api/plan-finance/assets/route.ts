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
    const loai      = searchParams.get("loai")      ?? "";

    const where = {
      ...(search    && { tenTaiSan: { contains: search } }),
      ...(trangThai && { trangThai }),
      ...(loai      && { loai }),
    };

    const [total, items] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({ where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (e: unknown) {
    console.error("[GET /assets]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { code, tenTaiSan, loai, ngayMua, giaTriMua, giaTriConLai, khauHao, trangThai, viTri, ghiChu } = body;
    if (!tenTaiSan?.trim()) return NextResponse.json({ error: "Tên tài sản không được để trống" }, { status: 400 });

    const item = await prisma.asset.create({
      data: {
        code, tenTaiSan: tenTaiSan.trim(), loai, viTri, ghiChu,
        giaTriMua:    parseFloat(giaTriMua    ?? 0),
        giaTriConLai: parseFloat(giaTriConLai ?? 0),
        khauHao:      parseFloat(khauHao      ?? 0),
        trangThai: trangThai ?? "dang-su-dung",
        ...(ngayMua && { ngayMua: new Date(ngayMua) }),
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
