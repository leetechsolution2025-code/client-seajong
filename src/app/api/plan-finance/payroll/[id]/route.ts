import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      ngayCong, ngayNghiPhep, ngayNghiKhac, gioLamThem,
      luongCoBan, phuCap, thuong, luongLamThem,
      khauTruBH, thueTNCN, khauTruKhac,
      trangThai, ngayTra, ghiChu,
    } = body;

    // Lấy record hiện tại để merge
    const current = await prisma.payroll.findUnique({ where: { id: params.id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const cb  = luongCoBan   !== undefined ? parseFloat(luongCoBan)   : current.luongCoBan;
    const pc  = phuCap       !== undefined ? parseFloat(phuCap)       : current.phuCap;
    const tw  = thuong       !== undefined ? parseFloat(thuong)       : current.thuong;
    const lt  = luongLamThem !== undefined ? parseFloat(luongLamThem) : current.luongLamThem;
    const bh  = khauTruBH   !== undefined ? parseFloat(khauTruBH)    : current.khauTruBH;
    const tax = thueTNCN     !== undefined ? parseFloat(thueTNCN)     : current.thueTNCN;
    const kk  = khauTruKhac  !== undefined ? parseFloat(khauTruKhac)  : current.khauTruKhac;

    const luongThucNhan = (cb + pc + tw + lt) - bh - tax - kk;
    const chiPhiCtyDong = cb * 0.235;
    const tongChiPhiCty = luongThucNhan + chiPhiCtyDong;

    const item = await prisma.payroll.update({
      where: { id: params.id },
      data: {
        ...(ngayCong     !== undefined && { ngayCong:     parseFloat(ngayCong) }),
        ...(ngayNghiPhep !== undefined && { ngayNghiPhep: parseFloat(ngayNghiPhep) }),
        ...(ngayNghiKhac !== undefined && { ngayNghiKhac: parseFloat(ngayNghiKhac) }),
        ...(gioLamThem   !== undefined && { gioLamThem:   parseFloat(gioLamThem) }),
        luongCoBan: cb, phuCap: pc, thuong: tw, luongLamThem: lt,
        khauTruBH: bh, thueTNCN: tax, khauTruKhac: kk,
        luongThucNhan, chiPhiCtyDong, tongChiPhiCty,
        ...(trangThai !== undefined && { trangThai }),
        ...(ngayTra   !== undefined && { ngayTra: ngayTra ? new Date(ngayTra) : null }),
        ...(ghiChu    !== undefined && { ghiChu }),
      },
      include: { employee: { select: { id: true, fullName: true, code: true, departmentName: true } } },
    });
    return NextResponse.json(item);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await prisma.payroll.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
