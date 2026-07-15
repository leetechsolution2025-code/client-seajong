import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user;

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    let type = searchParams.get("type"); // optional override

    // Determine type from warehouseId if type is not provided
    if (!type && warehouseId) {
      const wh = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { type: true, code: true }
      });
      if (wh) {
        const code = (wh as any).code;
        if (code === "KVP") {
          type = "MATERIAL";
        } else if (code === "KHO-THANHPHAM") {
          type = "PRODUCT";
        } else if (code === "KHO-LOI") {
          type = "DEFECT";
        } else if (code === "KHO-CHINH") {
          type = "PRODUCT_SYNC";
        } else {
          type = (wh as any).type;
        }
      }
    }

    let activeIndustryCode = "sanitary";
    if (searchParams.get("industryCode")) {
      activeIndustryCode = searchParams.get("industryCode") as string;
    } else if ((user as any)?.client?.industry) {
      activeIndustryCode = (user as any).client.industry.code;
    } else {
      const client = await prisma.client.findFirst({ include: { industry: true } });
      if (client?.industry) {
        activeIndustryCode = client.industry.code;
      }
    }

    let result: any[] = [];

    if (type === "MATERIAL") {
      const allCats = await prisma.category.findMany({
        where: { type: "vat_tu_san_xuat", isActive: true },
        orderBy: { sortOrder: "asc" }
      });
      
      const industryMaterialCodeMap: Record<string, string> = {
        "sanitary": "VTSX_VESINH",
        "building_materials": "VTSX_VLXD"
      };
      const matRootCode = industryMaterialCodeMap[activeIndustryCode] || "VTSX_GO";
      
      const rootCategory = allCats.find(c => c.code === matRootCode && c.parentId === null);
      if (rootCategory) {
        const descendantIds = [rootCategory.id];
        const collectDescendants = (parentId: string) => {
          allCats.forEach(cat => {
            if (cat.parentId === parentId) {
              descendantIds.push(cat.id);
              collectDescendants(cat.id);
            }
          });
        };
        collectDescendants(rootCategory.id);
        const filteredCats = allCats.filter(c => descendantIds.includes(c.id));
        result = buildCategoryTree(filteredCats, rootCategory.id);
      } else {
        result = buildCategoryTree(allCats);
      }
    } else if (type === "PRODUCT") {
      const cats = await prisma.category.findMany({
        where: { type: "danh_muc_thanh_pham", isActive: true },
        orderBy: { sortOrder: "asc" }
      });
      result = buildCategoryTree(cats);
    } else if (type === "DEFECT") {
      const cats = await prisma.category.findMany({
        where: { type: "defects", isActive: true },
        orderBy: { sortOrder: "asc" }
      });
      result = buildCategoryTree(cats);
    } else {
      // Default / PRODUCT_SYNC: InventoryCategory
      const industryProductCodeMap: Record<string, string> = {
        "sanitary": "SP_VESINH",
        "building_materials": "SP_VLXD"
      };
      const prodRootCode = industryProductCodeMap[activeIndustryCode] || "SP_GO";

      const rootCategory = await prisma.inventoryCategory.findFirst({
        where: { code: prodRootCode, parentId: null, isActive: true }
      });
      
      const allCats = await prisma.inventoryCategory.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" }
      });
      
      if (rootCategory) {
        // Chỉ lấy các danh mục thuộc cây của rootCategory
        const descendantIds = [rootCategory.id];
        const collectDescendants = (parentId: string) => {
          allCats.forEach(cat => {
            if (cat.parentId === parentId) {
              descendantIds.push(cat.id);
              collectDescendants(cat.id);
            }
          });
        };
        collectDescendants(rootCategory.id);
        
        const filteredCats = allCats.filter(c => descendantIds.includes(c.id));
        result = buildCategoryTree(filteredCats, rootCategory.id);
      } else {
        result = buildCategoryTree(allCats);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fetch logistics categories error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Helper: Build category tree as a flat array for UI (LogisticsInventory, InventoryManagement)
// React components expect a flat list with { id, name, isHeader, level }
function buildCategoryTree(flatList: any[], parentId: string | null = null, level = 0): any[] {
  const result: any[] = [];
  const children = flatList.filter(c => c.parentId === parentId);
  for (const child of children) {
    const hasChildren = flatList.some(c => c.parentId === child.id);
    result.push({
      id: child.id,
      name: child.name,
      code: child.code,
      description: child.description,
      isHeader: level === 0 && hasChildren,
      level
    });
    const childNodes = buildCategoryTree(flatList, child.id, level + 1);
    result.push(...childNodes);
  }
  return result;
}
