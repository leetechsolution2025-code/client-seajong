import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/plan-finance/debts/[id] — cập nhật daThu / trangThai
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await req.json();
    const { daThu, trangThai, hanThanhToan, ghiChu, doiTuong, soTien } = body;

    const existing = await prisma.debt.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    const newDaThu = daThu !== undefined ? parseFloat(daThu) : existing.daThu;
    const newSoTien = soTien !== undefined ? parseFloat(soTien) : existing.soTien;

    // Tự tính trạng thái nếu không truyền
    let autoStatus = trangThai ?? existing.trangThai;
    if (daThu !== undefined && trangThai === undefined) {
      if (newDaThu <= 0) autoStatus = "chua-thu";
      else if (newDaThu >= newSoTien) autoStatus = "da-thu";
      else autoStatus = "mot-phan";
      // Kiểm tra quá hạn
      if (autoStatus !== "da-thu" && existing.hanThanhToan && new Date(existing.hanThanhToan) < new Date()) {
        autoStatus = "qua-han";
      }
    }

    const updated = await prisma.debt.update({
      where: { id },
      data: {
        ...(doiTuong !== undefined && { doiTuong: doiTuong.trim() }),
        ...(soTien !== undefined && { soTien: newSoTien }),
        daThu: newDaThu,
        trangThai: autoStatus,
        ...(ghiChu !== undefined && { ghiChu }),
        ...(hanThanhToan !== undefined && {
          hanThanhToan: hanThanhToan ? new Date(hanThanhToan) : null,
        }),
      },
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/plan-finance/debts/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await prisma.debt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
