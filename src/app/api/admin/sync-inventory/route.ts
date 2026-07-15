import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Đồng bộ MaterialItem (loai = 'vat-tu')
    const materials = await (prisma as any).materialItem.findMany();
    let matCount = 0;
    for (const mat of materials) {
      if (!mat.code) continue;
      await prisma.inventoryItem.upsert({
        where: { code: mat.code },
        create: {
          code: mat.code,
          tenHang: mat.name,
          loai: "vat-tu",
          brand: mat.brand || "Seajong",
          categoryId: null, // Bỏ qua category vì khác bảng
          donVi: mat.unit || "cái",
          soLuongMin: mat.minStock || 0,
          giaNhap: mat.price || 0,
          giaBan: mat.giaBan || 0,
          thongSoKyThuat: mat.thongSoKyThuat || "",
          imageUrl: mat.imageUrl || null,
          chieuDai: mat.chieuDai || null,
        },
        update: {
          tenHang: mat.name,
          loai: "vat-tu",
          categoryId: null,
          donVi: mat.unit || "cái",
          soLuongMin: mat.minStock || 0,
          giaNhap: mat.price || 0,
          giaBan: mat.giaBan || 0,
          thongSoKyThuat: mat.thongSoKyThuat || "",
          imageUrl: mat.imageUrl || null,
          chieuDai: mat.chieuDai || null,
        }
      });
      matCount++;
    }

    // 2. Đồng bộ ManufacturedProduct (loai = 'thanh-pham')
    const products = await prisma.manufacturedProduct.findMany({
      include: { dinhMucs: true }
    });
    let prodCount = 0;
    for (const prod of products) {
      if (!prod.code) continue;
      const dinhMucId = prod.dinhMucs.length > 0 ? prod.dinhMucs[0].id : null;
      
      await prisma.inventoryItem.upsert({
        where: { code: prod.code },
        create: {
          code: prod.code,
          tenHang: prod.name,
          loai: "thanh-pham",
          brand: "Seajong",
          categoryId: null,
          donVi: prod.unit || "bộ",
          ghiChu: prod.notes || "",
          imageUrl: prod.imageUrl || null,
          dinhMucId: dinhMucId,
        },
        update: {
          tenHang: prod.name,
          loai: "thanh-pham",
          categoryId: null,
          donVi: prod.unit || "bộ",
          ghiChu: prod.notes || "",
          imageUrl: prod.imageUrl || null,
          dinhMucId: dinhMucId,
        }
      });
      prodCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Đồng bộ thành công ${matCount} vật tư và ${prodCount} thành phẩm vào bảng InventoryItem.`
    });
  } catch (error: any) {
    console.error("Lỗi đồng bộ inventory:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
