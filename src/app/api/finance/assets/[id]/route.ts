import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteAutoJournalByReference } from "@/lib/accounting-engine";

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


    // BACKFILL DEPRECIATION IF MISSING
    if (trangThai === "dang-su-dung" && ngayBatDauKhauHao) {
      const startDate = new Date(ngayBatDauKhauHao);
      const now = new Date();
      const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
      const currentMonth = now.getFullYear() * 12 + now.getMonth();
      const lastCompletedMonth = (now.getDate() >= 28) ? currentMonth : currentMonth - 1;
      
      if (startMonth <= lastCompletedMonth && Number(soThangKhauHao) > 0) {
        const depreciationPerMonth = Number(giaTriMua) / Number(soThangKhauHao);
        let depDebitCode = "642";
        if (loai === "Máy móc, thiết bị" || (donVi || "").toLowerCase().includes("sản xuất")) {
          depDebitCode = "627";
        }
        
        for (let m = startMonth; m <= lastCompletedMonth; m++) {
          const mYear = Math.floor(m / 12);
          const mMonth = (m % 12) + 1;
          
          const { createAutoJournal } = require("@/lib/accounting-engine");
          const existingEntry = await (prisma as any).journalEntry.findFirst({
            where: {
              referenceCode: code,
              description: { contains: `Khấu hao tháng ${mMonth}/${mYear}` },
              sourceModule: "ASSETS"
            }
          });

          if (!existingEntry) {
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
    }
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
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (asset) {
      await deleteAutoJournalByReference(asset.code, "Xoá tài sản cố định");
    }
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
