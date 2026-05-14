import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    let warehouseType = "MATERIAL"; // Default to material if no warehouse or material warehouse
    if (warehouseId) {
      const wh = await prisma.warehouse.findUnique({ 
        where: { id: warehouseId }, 
        select: { type: true } 
      } as any);
      if (wh) warehouseType = (wh as any).type;
    }

    let allCategories: any[] = [];
    // Kho hàng lỗi (DEFECT) cũng dùng bộ danh mục của hàng hóa (PRODUCT)
    if (warehouseType === "PRODUCT" || warehouseType === "DEFECT") {
      allCategories = await prisma.inventoryCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      });
    } else {
      allCategories = await prisma.category.findMany({
        where: { type: "vat_tu_san_xuat", isActive: true },
        orderBy: { sortOrder: "asc" }
      });
    }

    const result: any[] = [];
    const buildTree = (parentId: string | null, level: number) => {
      const children = allCategories.filter(c => (c as any).parentId === parentId);
      children.forEach(cat => {
        result.push({
          id: cat.id,
          name: cat.name,
          code: cat.code,
          isHeader: parentId === null && level === 0,
          level: level
        });
        buildTree(cat.id, level + 1);
      });
    };

    buildTree(null, 0);

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/production/materials/categories]", e);
    return NextResponse.json([], { status: 500 });
  }
}
