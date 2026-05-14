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
    const { code, tenDinhMuc, inventoryItemId, vatTu = [] } = body;

    // Tạo định mức mới
    const dm = await prisma.dinhMuc.create({
      data: {
        code,
        tenDinhMuc,
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

    // Liên kết định mức với sản phẩm
    if (inventoryItemId) {
      await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { dinhMucId: dm.id }
      });
    }

    return NextResponse.json(dm, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/production/bom]", e);
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Mã định mức đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
