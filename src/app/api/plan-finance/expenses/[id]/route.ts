import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET single ────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const item = await prisma.expense.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── PATCH (update) ────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { tenChiPhi, loai, soTien, ngayChiTra, nguoiChiTra, trangThai, ghiChu } = body;

    const item = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...(tenChiPhi !== undefined && { tenChiPhi: tenChiPhi.trim() }),
        ...(loai       !== undefined && { loai }),
        ...(soTien     !== undefined && { soTien: parseFloat(soTien) }),
        ...(nguoiChiTra !== undefined && { nguoiChiTra }),
        ...(trangThai  !== undefined && { trangThai }),
        ...(ghiChu     !== undefined && { ghiChu }),
        ...(ngayChiTra !== undefined && {
          ngayChiTra: ngayChiTra ? new Date(ngayChiTra) : null,
        }),
      },
    });

    return NextResponse.json(item);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.expense.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
