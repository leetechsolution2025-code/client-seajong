import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const item = await prisma.asset.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { code, tenTaiSan, loai, ngayMua, giaTriMua, giaTriConLai, khauHao, trangThai, viTri, ghiChu } = body;
    const item = await prisma.asset.update({
      where: { id: params.id },
      data: {
        ...(code        !== undefined && { code }),
        ...(tenTaiSan   !== undefined && { tenTaiSan: tenTaiSan.trim() }),
        ...(loai        !== undefined && { loai }),
        ...(viTri       !== undefined && { viTri }),
        ...(ghiChu      !== undefined && { ghiChu }),
        ...(trangThai   !== undefined && { trangThai }),
        ...(giaTriMua    !== undefined && { giaTriMua:    parseFloat(giaTriMua) }),
        ...(giaTriConLai !== undefined && { giaTriConLai: parseFloat(giaTriConLai) }),
        ...(khauHao      !== undefined && { khauHao:      parseFloat(khauHao) }),
        ...(ngayMua      !== undefined && { ngayMua: ngayMua ? new Date(ngayMua) : null }),
      },
    });
    return NextResponse.json(item);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await prisma.asset.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
