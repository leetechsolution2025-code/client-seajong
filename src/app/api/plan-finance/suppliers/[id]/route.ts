import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET — chi tiết NCC ───────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [supplier, orders] = await Promise.all([
    prisma.supplier.findUnique({
      where: { id },
      include: { categories: { include: { category: true } } },
    }),
    prisma.purchaseOrder.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, code: true, ngayDat: true, trangThai: true,
        tongTien: true, daThanhToan: true,
      },
    }),
  ]);

  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const congNoHienTai = orders
    .filter(o => o.trangThai !== "cancelled")
    .reduce((sum, o) => sum + Math.max(0, o.tongTien - o.daThanhToan), 0);

  return NextResponse.json({ supplier, orders, congNoHienTai });
}

// ── PATCH — cập nhật NCC ──────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();
  const { categoryIds, ...rest } = body;

  try {
    const data: Record<string, unknown> = {};
    if (rest.name        !== undefined) data.name        = rest.name;
    if (rest.address     !== undefined) data.address     = rest.address     || null;
    if (rest.contactName !== undefined) data.contactName = rest.contactName || null;
    if (rest.xungHo      !== undefined) data.xungHo      = rest.xungHo      || null;
    if (rest.phone       !== undefined) data.phone       = rest.phone       || null;
    if (rest.email       !== undefined) data.email       = rest.email       || null;
    if (rest.taxCode     !== undefined) data.taxCode     = rest.taxCode     || null;
    if (rest.website     !== undefined) data.website     = rest.website     || null;
    if (rest.hanMucNo    !== undefined) data.hanMucNo    = Number(rest.hanMucNo);
    if (rest.danhGia     !== undefined) data.danhGia     = Number(rest.danhGia);
    if (rest.ghiChu      !== undefined) data.ghiChu      = rest.ghiChu      || null;
    if (rest.trangThai   !== undefined) data.trangThai   = rest.trangThai;

    // Cập nhật danh mục nếu có
    if (Array.isArray(categoryIds)) {
      await prisma.supplierCategory.deleteMany({ where: { supplierId: id } });
      if (categoryIds.length > 0) {
        await prisma.supplierCategory.createMany({
          data: categoryIds.map((cid: string) => ({ supplierId: id, categoryId: cid })),
        });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
      include: { categories: { include: { category: true } } },
    });

    return NextResponse.json(supplier);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── DELETE — xoá NCC ──────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
