import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAutoJournal } from "@/lib/accounting-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const date = body.date ? new Date(body.date) : new Date();
    
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const assets = await prisma.asset.findMany({
      where: {
        trangThai: "dang-su-dung",
        soThangKhauHao: { gt: 0 },
        ngayBatDauKhauHao: { not: null }
      }
    });

    let processedCount = 0;

    for (const asset of assets) {
      const depreciationPerMonth = (asset.giaTriMua || 0) / (asset.soThangKhauHao || 1);
      
      if (depreciationPerMonth <= 0) continue;

      // Check if already depreciated this month
      const existingEntry = await (prisma as any).journalEntry.findFirst({
        where: {
          referenceCode: asset.code,
          description: { contains: `Khấu hao tháng ${month}/${year}` },
          sourceModule: "ASSETS"
        }
      });

      if (!existingEntry) {
        let debitCode = "642"; // Chi phí QLDN
        if (asset.loai === "Máy móc, thiết bị" || asset.donVi?.toLowerCase().includes("sản xuất")) {
          debitCode = "627"; // Chi phí sản xuất chung
        }

        await createAutoJournal({
          event: "ASSET_DEPRECIATION" as any,
          amount: Math.round(depreciationPerMonth),
          description: `Khấu hao tháng ${month}/${year} cho TS: ${asset.tenTaiSan}`,
          referenceCode: asset.code || undefined,
          overrideDebitCode: debitCode,
          overrideCreditCode: "214", // Hao mòn TSCĐ
          date: new Date(year, month - 1, 28) // Ghi nhận cuối tháng
        });
        processedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Đã chạy khấu hao cho ${processedCount} tài sản trong tháng ${month}/${year}` 
    });

  } catch (error: any) {
    console.error("[CRON /depreciation]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
