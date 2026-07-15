import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const prodCategories = await prisma.category.findMany({
      where: {
        type: { in: ['danh_muc_thanh_pham', 'vat_tu_san_xuat'] }
      }
    });

    let count = 0;
    const categoryMap: Record<string, string> = {}; // map from Category.id to InventoryCategory.id

    for (const cat of prodCategories) {
      let existing = await prisma.inventoryCategory.findFirst({
        where: {
          OR: [
            { name: cat.name },
            ...(cat.code ? [{ code: cat.code }] : [])
          ]
        }
      });

      if (!existing) {
        existing = await prisma.inventoryCategory.create({
          data: {
            id: cat.id,
            name: cat.name,
            code: cat.code,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
            parentId: null 
          }
        });
        count++;
      }
      categoryMap[cat.id] = existing.id;
    }

    const materials = await (prisma as any).materialItem.findMany();
    for (const mat of materials) {
      if (mat.code && mat.categoryId && categoryMap[mat.categoryId]) {
        await prisma.inventoryItem.updateMany({
          where: { code: mat.code, loai: 'vat-tu' },
          data: { categoryId: categoryMap[mat.categoryId] }
        });
      }
    }

    const products = await prisma.manufacturedProduct.findMany();
    for (const prod of products) {
      if (prod.code && prod.productCategoryId && categoryMap[prod.productCategoryId]) {
        await prisma.inventoryItem.updateMany({
          where: { code: prod.code, loai: 'thanh-pham' },
          data: { categoryId: categoryMap[prod.productCategoryId] }
        });
      }
    }

    return NextResponse.json({ success: true, message: `Synced ${count} new categories and updated items.` });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
