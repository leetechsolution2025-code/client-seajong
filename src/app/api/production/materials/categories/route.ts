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

    const user = await prisma.user.findFirst({
      where: { email: session.user.email || "" },
      include: { client: { include: { industry: true } } }
    });

    let activeIndustryCode = "wood_door";
    
    if (user?.role === "SUPERADMIN") {
      const cookieHeader = req.headers.get("cookie") || "";
      const cookieCode = cookieHeader
        .split("; ")
        .find(row => row.startsWith("active_industry_code="))
        ?.split("=")[1];
      
      if (cookieCode) {
        activeIndustryCode = cookieCode;
      } else {
        const firstClient = await prisma.client.findFirst({
          include: { industry: true }
        });
        if (firstClient?.industry) {
          activeIndustryCode = firstClient.industry.code;
        }
      }
    } else if (user?.client?.industry) {
      activeIndustryCode = user.client.industry.code;
    } else {
      const client = await prisma.client.findFirst({
        include: { industry: true }
      });
      if (client?.industry) {
        activeIndustryCode = client.industry.code;
      }
    }

    let allCategories: any[] = [];
    let rootCategoryId: string | null = null;

    // Kho hàng lỗi (DEFECT) cũng dùng bộ danh mục của hàng hóa (PRODUCT)
    if (warehouseType === "PRODUCT" || warehouseType === "DEFECT") {
      const industryProductCodeMap: Record<string, string> = {
        "wood_door": "SP_GO",
        "sanitary": "SP_VESINH",
        "building_materials": "SP_VLXD"
      };
      const prodRootCode = industryProductCodeMap[activeIndustryCode] || "SP_GO";
      const rootCategory = await prisma.inventoryCategory.findFirst({
        where: { code: prodRootCode, parentId: null, isActive: true }
      });
      if (rootCategory) {
        rootCategoryId = rootCategory.id;
      }

      allCategories = await prisma.inventoryCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      });
    } else {
      // Tìm Industry để lấy rootCategoryCode
      const industry = await prisma.industry.findUnique({
        where: { code: activeIndustryCode }
      });

      if (industry) {
        // Tìm danh mục gốc tương ứng với rootCategoryCode
        const rootCategory = await prisma.category.findFirst({
          where: { code: industry.rootCategoryCode, type: "vat_tu_san_xuat", isActive: true }
        });
        if (rootCategory) {
          rootCategoryId = rootCategory.id;
        }
      }

      allCategories = await prisma.category.findMany({
        where: { type: "vat_tu_san_xuat", isActive: true },
        orderBy: { sortOrder: "asc" }
      });
    }

    const result: any[] = [];
    const buildTree = (parentId: string | null, level: number) => {
      const children = allCategories.filter(c => (c as any).parentId === parentId);
      children.forEach(cat => {
        const hasChildren = allCategories.some(c => (c as any).parentId === cat.id);
        result.push({
          id: cat.id,
          name: cat.name,
          code: cat.code,
          isHeader: hasChildren,
          level: level
        });
        buildTree(cat.id, level + 1);
      });
    };

    buildTree(rootCategoryId, 0);

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/production/materials/categories]", e);
    return NextResponse.json([], { status: 500 });
  }
}
