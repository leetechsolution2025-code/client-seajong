import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch all assets from DB
    const [rawAssets, dbCategories, dbStatuses] = await Promise.all([
      prisma.asset.findMany({
        orderBy: { code: "asc" }
      }),
      prisma.category.findMany({
        where: { type: "asset_type", isActive: true },
        orderBy: { sortOrder: "asc" }
      }),
      prisma.category.findMany({
        where: { type: "trang_thai_tai_san", isActive: true },
        orderBy: { sortOrder: "asc" }
      })
    ]);

    // 2. Compute dynamic straight-line depreciation calculations
    const now = new Date();
    const assets = rawAssets.map(asset => {
      const originalValue = asset.giaTriMua || 0;
      const totalMonths = asset.soThangKhauHao || 1;
      const start = asset.ngayBatDauKhauHao ? new Date(asset.ngayBatDauKhauHao) : (asset.ngayMua ? new Date(asset.ngayMua) : now);
      
      // Calculate elapsed months from start date to today (inclusive of starting month)
      const elapsedMonths = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1);
      
      const monthlyDepreciation = Math.round(originalValue / totalMonths);
      const accumulatedDepreciation = Math.min(originalValue, Math.round(elapsedMonths * (originalValue / totalMonths)));
      const remainingValue = originalValue - accumulatedDepreciation;

      return {
        id: asset.id,
        code: asset.code || "TSCD-N/A",
        tenTaiSan: asset.tenTaiSan,
        loai: asset.loai || "Khác",
        ngayMua: asset.ngayMua ? asset.ngayMua.toISOString().split("T")[0] : "",
        originalValue,
        totalMonths,
        monthlyDepreciation,
        accumulatedDepreciation,
        remainingValue,
        trangThai: asset.trangThai || "dang-su-dung",
        viTri: asset.viTri || "",
        donVi: asset.donVi || "",
        nguoiSuDung: asset.nguoiSuDungId || "",
        ghiChu: asset.ghiChu || ""
      };
    });

    // 3. Calculate total summary metrics
    let totalOriginalValue = 0;
    let totalAccumulatedDepreciation = 0;
    let totalRemainingValue = 0;

    assets.forEach(a => {
      totalOriginalValue += a.originalValue;
      totalAccumulatedDepreciation += a.accumulatedDepreciation;
      totalRemainingValue += a.remainingValue;
    });

    return NextResponse.json({
      success: true,
      assets,
      categories: dbCategories.map(c => ({
        id: c.id,
        name: c.name,
        parentId: c.parentId
      })),
      statuses: dbStatuses.map(s => s.name),
      summary: {
        totalOriginalValue,
        totalAccumulatedDepreciation,
        totalRemainingValue,
        totalCount: assets.length
      }
    });
  } catch (error: any) {
    console.error("[GET /api/board/finance-accounting/assets] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
