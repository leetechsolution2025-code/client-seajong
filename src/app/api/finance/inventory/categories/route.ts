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

    // 2. Tìm ID của nhánh "Vật tư sản xuất" để loại trừ
    const vtsxRoot = allCategories.find(c => c.code === 'VTSX');
    
    const result: any[] = [];

    // Hàm đệ quy xây dựng cây danh mục (Loại trừ nhánh VTSX)
    const buildTree = (parentId: string | null, level: number) => {
      const children = allCategories.filter(c => c.parentId === parentId);
      
      children.forEach(cat => {
        // Nếu là nhánh Vật tư sản xuất thì bỏ qua không quét tiếp
        if (vtsxRoot && (cat.id === vtsxRoot.id || cat.parentId === vtsxRoot.id)) return;
        
        // Kiểm tra xem có phải là con của VTSX ở cấp sâu hơn không (để an toàn tuyệt đối)
        if (vtsxRoot) {
            let temp: any = cat;
            let isVTSXChild = false;
            while(temp.parentId) {
                if (temp.parentId === vtsxRoot.id) { isVTSXChild = true; break; }
                const parent = allCategories.find(p => p.id === temp.parentId);
                if (!parent) break;
                temp = parent;
            }
            if (isVTSXChild) return;
        }

        const isRootLevel = parentId === null;
        
        result.push({
          id: cat.id,
          name: cat.name,
          isHeader: isRootLevel && children.length > 0, // Chỉ là header nếu có con
          level: level
        });

        buildTree(cat.id, level + 1);
      });
    };

    // Bắt đầu quét từ cấp cao nhất (parentId = null)
    buildTree(null, 0);

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/finance/inventory/categories]", e);
    return NextResponse.json([]);
  }
}
