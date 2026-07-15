import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAutoJournal } from "@/lib/accounting-engine";

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
        const startMonth = start.getFullYear() * 12 + start.getMonth();
        const currentMonth = now.getFullYear() * 12 + now.getMonth();
        const lastCompletedMonth = (now.getDate() >= 28) ? currentMonth : currentMonth - 1;
        const monthsDiff = lastCompletedMonth - startMonth + 1;
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
        trangThai: body.trangThai || "chua-su-dung",
        ngayMua: ngayMua ? new Date(ngayMua) : null,
        ngayBatDauKhauHao: ngayBatDauKhauHao ? new Date(ngayBatDauKhauHao) : null,
      } as any,
    });
    
    // Auto record journal for asset purchase
    let debitCode = "2118";
    if (loai === "Nhà cửa, vật kiến trúc") debitCode = "2111";
    else if (loai === "Máy móc, thiết bị") debitCode = "2112";
    else if (loai === "Phương tiện vận tải") debitCode = "2113";
    else if (loai === "Thiết bị, dụng cụ quản lý") debitCode = "2114";
    else if (loai === "Phần mềm máy tính") debitCode = "213";
    
    await createAutoJournal({
      event: "ASSET_PURCHASE" as any,
      amount: Number(giaTriMua) || 0,
      description: `Mua mới tài sản: ${tenTaiSan} (Mã: ${code})`,
      referenceCode: code,
      overrideDebitCode: debitCode,
    });
    

    // BACKFILL DEPRECIATION
    const actualStatus = body.trangThai || "chua-su-dung";
    if (actualStatus === "dang-su-dung" && ngayBatDauKhauHao) {
      const startDate = new Date(ngayBatDauKhauHao);
      const now = new Date();
      const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
      const currentMonth = now.getFullYear() * 12 + now.getMonth();
      const lastCompletedMonth = (now.getDate() >= 28) ? currentMonth : currentMonth - 1;
      
      if (startMonth <= lastCompletedMonth && parseInt(soThangKhauHao) > 0) {
        const depreciationPerMonth = Number(giaTriMua) / parseInt(soThangKhauHao);
        let depDebitCode = "642";
        if (loai === "Máy móc, thiết bị" || (donVi || "").toLowerCase().includes("sản xuất")) {
          depDebitCode = "627";
        }
        
        for (let m = startMonth; m <= lastCompletedMonth; m++) {
          const mYear = Math.floor(m / 12);
          const mMonth = (m % 12) + 1;
          
          await createAutoJournal({
            event: "ASSET_DEPRECIATION" as any,
            amount: Math.round(depreciationPerMonth),
            description: `Khấu hao tháng ${mMonth}/${mYear} cho TS: ${tenTaiSan}`,
            referenceCode: code,
            overrideDebitCode: depDebitCode,
            overrideCreditCode: "214",
            date: new Date(mYear, mMonth - 1, 28)
          });
        }
      }
    }
    
    return NextResponse.json(asset);

  } catch (error: any) {
    console.error("Create asset error details:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
