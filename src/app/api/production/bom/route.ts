import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/production/bom – Tạo định mức mới
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { code, tenDinhMuc, targetInventoryItemId, materialItemId, vatTu = [] } = body;
    const finalInventoryItemId = targetInventoryItemId || materialItemId || null;

    let finalCode = code;
    if (!finalCode) {
      finalCode = `DM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    for (const v of vatTu) {
      if (!v.inventoryItemId && (v.maVatTu || v.tenVatTu)) {
        let mat = null;
        if (v.maVatTu) {
          mat = await prisma.inventoryItem.findFirst({ where: { code: v.maVatTu } });
        } else if (v.tenVatTu) {
          // Sometimes tenVatTu is actually the code
          mat = await prisma.inventoryItem.findFirst({
            where: {
              OR: [
                { tenHang: v.tenVatTu },
                { code: v.tenVatTu }
              ]
            }
          });
        }
        
        if (!mat) {
          const defaultPrice = 10000 + ((v.tenVatTu || v.maVatTu || "Vattu").length * 2000);
          const giaBan = Math.round((defaultPrice * 1.2) / 1000) * 1000;
          mat = await prisma.inventoryItem.create({
            data: {
              tenHang: v.tenVatTu || v.maVatTu || "Chưa có tên",
              code: v.maVatTu || v.tenVatTu || `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              donVi: v.donViTinh || "Cái",
              giaNhap: defaultPrice,
              giaBan: giaBan,
              loai: 'vat-tu'
            }
          });
        }
        v.inventoryItemId = mat.id;
      }
    }

    // Tạo định mức mới
    const dm = await prisma.dinhMuc.create({
      data: {
        code: finalCode,
        tenDinhMuc,
        inventoryItemId: finalInventoryItemId,
        vatTu: {
          create: vatTu.map((v: any) => ({
            inventoryItemId: v.inventoryItemId || null,
            maVatTu: v.maVatTu || null,
            tenVatTu: v.tenVatTu || "Chưa có tên",
            soLuong: v.soLuong || 1,
            donViTinh: v.donViTinh || "",
            ghiChu: v.ghiChu || "",
          }))
        }
      }
    });

    if (finalInventoryItemId) {
      await prisma.$executeRaw`
        UPDATE InventoryItem
        SET giaNhap = (
          SELECT COALESCE(SUM(dv.soLuong * i.giaNhap), 0)
          FROM DinhMucVatTu dv
          JOIN InventoryItem i ON dv.inventoryItemId = i.id
          WHERE dv.dinhMucId = ${dm.id}
        )
        WHERE id = ${finalInventoryItemId}
      `;

      // Tự động tính toán lại giá bán dựa trên giá vốn mới và cấu hình lợi nhuận
      await prisma.$executeRaw`
        UPDATE InventoryItem
        SET giaBan = CASE 
          WHEN phuongPhapTinhLoiNhuan = 'revenue' AND loiNhuanKyVong < 100 THEN ROUND((giaNhap / (1.0 - loiNhuanKyVong / 100.0)) / 1000.0) * 1000
          WHEN phuongPhapTinhLoiNhuan = 'cost' THEN ROUND((giaNhap * (1.0 + loiNhuanKyVong / 100.0)) / 1000.0) * 1000
          ELSE ROUND((giaNhap * 1.3) / 1000.0) * 1000
        END
        WHERE id = ${finalInventoryItemId}
      `;
    }

    return NextResponse.json(dm, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/production/bom]", e);
    require('fs').writeFileSync('bom-error.log', String(e.stack || e.message || e));
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Mã định mức đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
