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
    const { originalCode, tenDinhMuc, manufacturedProductId, vatTu = [] } = body;

    let finalCode = "";
    if (originalCode) {
      const existingBoms = await prisma.dinhMuc.findMany({
        where: { code: { startsWith: `${originalCode}-` } },
        select: { code: true }
      });
      const existingNumbers: number[] = [];
      for (const b of existingBoms) {
        if (!b.code) continue;
        const parts = b.code.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > 0) {
          existingNumbers.push(num);
        }
      }
      existingNumbers.sort((a, b) => a - b);
      let nextNum = 1;
      for (const num of existingNumbers) {
        if (num === nextNum) {
          nextNum++;
        } else if (num > nextNum) {
          break;
        }
      }
      finalCode = `${originalCode}-${String(nextNum).padStart(2, '0')}`;
    } else {
      finalCode = `DM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    for (const v of vatTu) {
    for (const v of vatTu) {
      if (!v.materialId && (v.maVatTu || v.tenVatTu)) {
        let mat = null;
        if (v.maVatTu) {
          mat = await prisma.materialItem.findFirst({ where: { code: v.maVatTu } });
        }
        if (!mat && v.tenVatTu) {
          mat = await prisma.materialItem.findFirst({
            where: { name: v.tenVatTu }
          });
        }
        if (!mat) {
          const defaultPrice = 10000 + ((v.tenVatTu || v.maVatTu || "Vattu").length * 2000);
          const giaBan = Math.round((defaultPrice * 1.2) / 1000) * 1000;
          mat = await prisma.materialItem.create({
            data: {
              name: v.tenVatTu || v.maVatTu || "Chưa có tên",
              code: v.maVatTu || `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              unit: v.donViTinh || "Cái",
              price: defaultPrice,
              giaBan: giaBan
            }
          });
        }
        v.materialId = mat.id;
      }
    }

    // Tạo định mức mới
    const dm = await prisma.dinhMuc.create({
      data: {
        code: finalCode,
        tenDinhMuc,
        manufacturedProductId: manufacturedProductId || null,
        vatTu: {
          create: vatTu.map((v: any) => ({
            materialId: v.materialId || null,
            maVatTu: v.maVatTu || null,
            tenVatTu: v.tenVatTu || "Chưa có tên",
            soLuong: v.soLuong || 1,
            donViTinh: v.donViTinh || "",
            ghiChu: v.ghiChu || "",
          }))
        }
      }
    });

    return NextResponse.json(dm, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/production/bom]", e);
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Mã định mức đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
