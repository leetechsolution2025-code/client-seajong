import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Lấy toàn bộ danh mục thành phẩm từ bảng Category
    const allCategories = await prisma.category.findMany({
      where: { type: 'danh_muc_thanh_pham', isActive: true },
      orderBy: { sortOrder: "asc" }
    });

    const result: any[] = [];
    if (!allCategories.length) return NextResponse.json([]);

    // Hàm đệ quy xây dựng cây danh mục
    const buildTree = (parentId: string | null, level: number) => {
      const children = allCategories.filter(c => c.parentId === parentId);
      
      children.forEach(cat => {
        const isRootLevel = parentId === null;
        const hasChildren = allCategories.some(c => c.parentId === cat.id);
        
        result.push({
          id: cat.id,
          name: cat.name,
          isHeader: isRootLevel && hasChildren, // Chỉ là header nếu có con
          level: level
        });

        buildTree(cat.id, level + 1);
      });
    };

    buildTree(null, 0);

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/production/manufactured-products/categories]", e);
    return NextResponse.json([]);
  }
}
