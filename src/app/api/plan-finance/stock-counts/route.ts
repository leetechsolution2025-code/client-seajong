import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * POST /api/plan-finance/stock-counts
 * Tạo hoặc cập nhật phiếu kiểm kho (draft).
 *
 * Body:
 * {
 *   id?:          string    // nếu có → update, không có → create
 *   soChungTu:    string
 *   scope:        "system" | "warehouse"
 *   warehouseId?: string
 *   nguoiKiem?:   string
 *   ngayKiem?:    string    // ISO date
 *   ghiChu?:      string
 *   trangThai?:   "nhap" | "hoan-thanh"
 *   lines: [{
 *     inventoryItemId: string
 *     warehouseId?:    string
 *     soLuongHeTong:   number
 *     soLuongThucTe?:  number | null
 *     chenh?:          number | null
 *     ghiChu?:         string
 *   }]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      id,
      soChungTu,
      scope       = "system",
      warehouseId,
      nguoiKiem,
      ngayKiem,
      ghiChu,
      trangThai   = "nhap",
      lines       = [],
    } = body;

    // Upsert header
    const header = id
      ? await prisma.stockCount.update({
          where: { id },
          data: {
            scope,
            warehouseId:   warehouseId || null,
            nguoiKiem:     nguoiKiem   || null,
            ngayKiem:      ngayKiem    ? new Date(ngayKiem) : undefined,
            ghiChu:        ghiChu      || null,
            trangThai,
          },
        })
      : await prisma.stockCount.create({
          data: {
            soChungTu:     soChungTu   || undefined,
            scope,
            warehouseId:   warehouseId || null,
            nguoiKiem:     nguoiKiem   || null,
            ngayKiem:      ngayKiem    ? new Date(ngayKiem) : new Date(),
            ghiChu:        ghiChu      || null,
            trangThai,
          },
        });

    // Xóa lines cũ và tạo lại
    await prisma.stockCountLine.deleteMany({ where: { stockCountId: header.id } });

    if (lines.length > 0) {
      await prisma.stockCountLine.createMany({
        data: lines.map((l: {
          inventoryItemId: string;
          warehouseId?: string;
          soLuongHeTong: number;
          soLuongThucTe?: number | null;
          chenh?: number | null;
          ghiChu?: string;
        }) => ({
          stockCountId:    header.id,
          inventoryItemId: l.inventoryItemId,
          warehouseId:     l.warehouseId     || null,
          soLuongHeTong:   l.soLuongHeTong   ?? 0,
          soLuongThucTe:   l.soLuongThucTe   ?? null,
          chenh:           l.chenh            ?? null,
          ghiChu:          l.ghiChu           || null,
        })),
      });
    }

    return NextResponse.json({ ok: true, id: header.id, soChungTu: header.soChungTu, trangThai: header.trangThai });
  } catch (e) {
    console.error("[POST /stock-counts]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/**
 * GET /api/plan-finance/stock-counts
 * Query: trangThai? (nhap | hoan-thanh | all), warehouseId?
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const trangThai   = searchParams.get("trangThai");
  const warehouseId = searchParams.get("warehouseId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (trangThai && trangThai !== "all") where.trangThai   = trangThai;
  if (warehouseId)                      where.warehouseId = warehouseId;

  const counts = await prisma.stockCount.findMany({
    where,
    include: {
      warehouse: { select: { name: true } },
      _count:    { select: { lines: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(counts.map(c => ({
    id:            c.id,
    soChungTu:     c.soChungTu,
    scope:         c.scope,
    warehouseId:   c.warehouseId,
    warehouseName: c.warehouse?.name ?? null,
    nguoiKiem:     c.nguoiKiem,
    ngayKiem:      c.ngayKiem,
    trangThai:     c.trangThai,
    ghiChu:        c.ghiChu,
    soLuongDong:   c._count.lines,
    updatedAt:     c.updatedAt,
  })));
}

/**
 * DELETE /api/plan-finance/stock-counts?id=xxx
 * Xóa phiếu kiểm kho nháp.
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  try {
    await prisma.stockCountLine.deleteMany({ where: { stockCountId: id } });
    await prisma.stockCount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /stock-counts]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
