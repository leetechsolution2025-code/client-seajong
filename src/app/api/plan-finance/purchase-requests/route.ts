import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status  = searchParams.get("status")  ?? "";
  const donVi   = searchParams.get("donVi")   ?? "";
  const search  = searchParams.get("search")  ?? "";
  const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1"));

  const where: Record<string, unknown> = {
    ...(status && { trangThai: status }),
    ...(donVi  && { donVi }),
    ...(search && {
      OR: [
        { code:         { contains: search } },
        { nguoiYeuCau:  { contains: search } },
        { donVi:        { contains: search } },
        { lyDo:         { contains: search } },
      ],
    }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.purchaseRequest.count({ where }),
    prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        items: { select: { id: true } },  // chỉ đếm số dòng
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map(r => ({
      id:           r.id,
      code:         r.code,
      nguoiYeuCau:  r.nguoiYeuCau,
      donVi:        r.donVi,
      ngayTao:      r.ngayTao,
      ngayCanCo:    r.ngayCanCo,
      lyDo:         r.lyDo,
      trangThai:    r.trangThai,
      soMatHang:    r.items.length,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { donVi, nguoiYeuCau, ngayCanCo, lyDo, ghiChu, lines } = body;

  // Auto-generate code
  const count = await prisma.purchaseRequest.count();
  const d = new Date();
  const code = `YC-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${String(count+1).padStart(4,"0")}`;

  const created = await prisma.purchaseRequest.create({
    data: {
      code,
      donVi,
      nguoiYeuCau,
      ngayCanCo: ngayCanCo ? new Date(ngayCanCo) : null,
      lyDo,
      ghiChu,
      createdById: session.user.id,
      items: {
        create: (lines as Array<{
          inventoryItemId?: string;
          tenHang: string;
          donVi?: string;
          soLuong: number;
          donGiaDK: number;
          ghiChu?: string;
          sortOrder?: number;
        }>).map((l, i) => ({
          inventoryItemId: l.inventoryItemId ?? null,
          tenHang:  l.tenHang,
          donVi:    l.donVi ?? null,
          soLuong:  l.soLuong,
          donGiaDK: l.donGiaDK,
          ghiChu:   l.ghiChu ?? null,
          sortOrder: i,
        })),
      },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
