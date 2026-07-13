import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Lấy toàn bộ danh mục đang hoạt động
    const allCategories = await prisma.inventoryCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    });

    // 2. Tìm ID của nhánh "Sản phẩm thành phẩm" để chỉ bao gồm nhánh này
    const spThanhPhamRoot = allCategories.find(c => c.code === 'SP_THANH_PHAM');
    
    const result: any[] = [];

    if (!spThanhPhamRoot) return NextResponse.json([]);

    // Hàm đệ quy xây dựng cây danh mục (Chỉ lấy nhánh SP_THANH_PHAM)
    const buildTree = (parentId: string | null, level: number) => {
      const children = allCategories.filter(c => c.parentId === parentId);
      
      children.forEach(cat => {
        const isRootLevel = parentId === spThanhPhamRoot.id;
        
        result.push({
          id: cat.id,
          name: cat.name,
          isHeader: isRootLevel && children.length > 0, // Chỉ là header nếu có con
          level: level
        });

        buildTree(cat.id, level + 1);
      });
    };

    // Bắt đầu quét từ cấp cao nhất của SP_THANH_PHAM (bỏ qua dòng thư mục gốc)
    buildTree(spThanhPhamRoot.id, 0);

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/production/manufactured-products/categories]", e);
    return NextResponse.json([]);
  }
}
