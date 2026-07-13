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
    const { code, tenDinhMuc, manufacturedProductId, vatTu = [] } = body;

    for (const v of vatTu) {
      if (!v.materialId && v.tenVatTu) {
        let mat = await prisma.materialItem.findFirst({
          where: { name: v.tenVatTu }
        });
        if (!mat) {
          const defaultPrice = 10000 + (v.tenVatTu.length * 2000);
          const giaBan = Math.round((defaultPrice * 1.2) / 1000) * 1000;
          mat = await prisma.materialItem.create({
            data: {
              name: v.tenVatTu,
              code: `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
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
        code,
        tenDinhMuc,
        manufacturedProductId: manufacturedProductId || null,
        vatTu: {
          create: vatTu.map((v: any) => ({
            materialId: v.materialId || null,
            tenVatTu: v.tenVatTu,
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
