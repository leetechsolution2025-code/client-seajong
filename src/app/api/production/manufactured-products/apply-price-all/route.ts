import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { marginPct } = body;

    if (typeof marginPct !== "number") {
      return NextResponse.json({ error: "Lợi nhuận kỳ vọng không hợp lệ" }, { status: 400 });
    }

    // Lấy tất cả sản phẩm cùng định mức và vật tư
    const products = await prisma.manufacturedProduct.findMany({
      include: {
        dinhMucs: {
          include: {
            vatTu: {
              include: {
                material: true
              }
            }
          }
        }
      }
    });

    let updatedCount = 0;

    for (const product of products) {
      if (!product.dinhMucs || product.dinhMucs.length === 0) continue;

      for (const dinhMuc of product.dinhMucs) {
        if (!dinhMuc.vatTu || dinhMuc.vatTu.length === 0) continue;

        // Tính chi phí
        const cost = dinhMuc.vatTu.reduce((sum: number, item: any) => {
          const materialPrice = item.material?.price || item.material?.giaNhap || 0;
          return sum + (item.soLuong || 0) * materialPrice;
        }, 0);

        // Tính giá bán mới
        const calculated = Math.round((cost * (1 + marginPct / 100)) / 1000) * 1000;

        // Cập nhật giá bán cho DinhMuc
        // @ts-ignore
        await prisma.manufacturedProduct.update({
          where: { id: product.id },
          data: { giaBan: calculated } as any
        });
        
        await prisma.dinhMuc.update({
          where: { id: dinhMuc.id },
          data: { giaBan: calculated } as any
        });
        
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (e: any) {
    console.error("[POST /api/production/manufactured-products/apply-price-all]", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
