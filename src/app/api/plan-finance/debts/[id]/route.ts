import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await req.json();
    const { daThu, trangThai, hanThanhToan, ghiChu, doiTuong, soTien } = body;

    const existing = await prisma.debt.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    const newDaThu = daThu !== undefined ? parseFloat(daThu) : existing.paidAmount;
    const newSoTien = soTien !== undefined ? parseFloat(soTien) : existing.amount;

    let autoStatus = existing.status;
    if (trangThai) {
      const statusMap: Record<string, string> = { "chua-thu": "UNPAID", "da-thu": "PAID", "mot-phan": "PARTIAL", "qua-han": "OVERDUE" };
      autoStatus = statusMap[trangThai] || trangThai;
    } else if (daThu !== undefined) {
      if (newDaThu <= 0) autoStatus = "UNPAID";
      else if (newDaThu >= newSoTien) autoStatus = "PAID";
      else autoStatus = "PARTIAL";
      if (autoStatus !== "PAID" && existing.dueDate && new Date(existing.dueDate) < new Date()) {
        autoStatus = "OVERDUE";
      }
    }

    const updated = await prisma.debt.update({
      where: { id },
      data: {
        ...(doiTuong !== undefined && { partnerName: doiTuong.trim() }),
        ...(soTien !== undefined && { amount: newSoTien }),
        paidAmount: newDaThu,
        status: autoStatus,
        ...(ghiChu !== undefined && { description: ghiChu }),
        ...(hanThanhToan !== undefined && {
          dueDate: hanThanhToan ? new Date(hanThanhToan) : null,
        }),
      },
    });

    const reverseStatusMap: Record<string, string> = { "UNPAID": "chua-thu", "PAID": "da-thu", "PARTIAL": "mot-phan", "OVERDUE": "qua-han" };
    const mappedUpdated = {
      ...updated,
      loai: updated.type,
      doiTuong: updated.partnerName,
      soTien: updated.amount,
      daThu: updated.paidAmount,
      hanThanhToan: updated.dueDate,
      trangThai: reverseStatusMap[updated.status] || updated.status,
      ghiChu: updated.description
    };
    return NextResponse.json(mappedUpdated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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
