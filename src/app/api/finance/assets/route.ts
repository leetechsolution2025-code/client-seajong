import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";

    const assets = await prisma.asset.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { tenTaiSan: { contains: search } },
              { code: { contains: search } },
            ]
          } : {},
          category ? { loai: category } : {},
          status ? { trangThai: status } : {},
        ]
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const now = new Date();
    const assetsWithDepreciation = assets.map((asset: any) => {
      let remainingValue = asset.giaTriMua;
      
      if (asset.soThangKhauHao && asset.soThangKhauHao > 0 && asset.ngayBatDauKhauHao) {
        const start = new Date(asset.ngayBatDauKhauHao);
        const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        
        if (monthsDiff > 0) {
          const depreciationPerMonth = asset.giaTriMua / asset.soThangKhauHao;
          remainingValue = Math.max(0, asset.giaTriMua - (monthsDiff * depreciationPerMonth));
        }
      }
      
      return {
        ...asset,
        giaTriConLai: remainingValue,
      };
    });

    // Tính toán thêm dữ liệu thống kê
    const stats = {
      totalValue: assetsWithDepreciation.reduce((sum, a) => sum + (a.giaTriConLai || 0), 0),
      totalInitialValue: assets.reduce((sum, a) => sum + (a.giaTriMua || 0), 0),
      countInUse: await prisma.asset.count({ where: { trangThai: "dang-su-dung" } }),
      countMaintenance: await prisma.asset.count({ where: { trangThai: "bao-tri" } }),
      countDepreciated: await prisma.asset.count({ where: { trangThai: "het-khau-hao" } }),
    };

    return NextResponse.json({ assets: assetsWithDepreciation, stats });
  } catch (error) {
    console.error("Fetch assets error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      code, tenTaiSan, loai, ngayMua, giaTriMua, giaTriConLai,
      soThangKhauHao, ngayBatDauKhauHao, chuKyBaoDuong,
      donVi, nguoiSuDungId, ghiChu 
    } = body;

    const asset = await prisma.asset.create({
      data: {
        code,
        tenTaiSan,
        loai,
        giaTriMua: Number(giaTriMua) || 0,
        giaTriConLai: Number(giaTriConLai) || Number(giaTriMua) || 0,
        soThangKhauHao: parseInt(soThangKhauHao) || 0,
        chuKyBaoDuong: parseInt(chuKyBaoDuong) || 0,
        donVi,
        nguoiSuDungId,
        ghiChu,
        trangThai: "chua-su-dung",
        ngayMua: ngayMua ? new Date(ngayMua) : null,
        ngayBatDauKhauHao: ngayBatDauKhauHao ? new Date(ngayBatDauKhauHao) : null,
      } as any,
    });
    return NextResponse.json(asset);
  } catch (error: any) {
    console.error("Create asset error details:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
