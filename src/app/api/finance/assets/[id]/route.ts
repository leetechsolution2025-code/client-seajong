import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log("Updating asset:", id, body);
    
    const { 
      code, tenTaiSan, loai, ngayMua, giaTriMua, giaTriConLai,
      soThangKhauHao, ngayBatDauKhauHao, chuKyBaoDuong,
      donVi, nguoiSuDungId, ghiChu, trangThai
    } = body;

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        code,
        tenTaiSan,
        loai,
        giaTriMua: Number(giaTriMua) || 0,
        giaTriConLai: Number(giaTriConLai) || 0,
        soThangKhauHao: Number(soThangKhauHao) || 0,
        chuKyBaoDuong: Number(chuKyBaoDuong) || 0,
        donVi,
        nguoiSuDungId,
        ghiChu,
        trangThai,
        ngayMua: ngayMua ? new Date(ngayMua) : null,
        ngayBatDauKhauHao: ngayBatDauKhauHao ? new Date(ngayBatDauKhauHao) : null,
      } as any,
    });

    return NextResponse.json(asset);
  } catch (error: any) {
    console.error("Update asset error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.asset.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete asset error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
