import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plan-finance/inventory/categories
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Đọc active_industry_code để lọc theo ngành hàng (loại doanh nghiệp)
    const cookieHeader = req.headers.get("cookie") || "";
    let activeIndustryCode = cookieHeader
      .split("; ")
      .find(row => row.startsWith("active_industry_code="))
      ?.split("=")[1];

    if (!activeIndustryCode) {
      const client = await prisma.client.findFirst({
        include: { industry: true }
      });
      if (client?.industry) {
        activeIndustryCode = client.industry.code;
      }
    }

    if (!activeIndustryCode) {
      activeIndustryCode = "sanitary";
    }

    let industryProdCategoryIds: string[] = [];
    const industryProductCodeMap: Record<string, string> = {
      "sanitary": "SP_VESINH",
      "building_materials": "SP_VLXD"
    };
    const prodRootCode = industryProductCodeMap[activeIndustryCode] || "SP_GO";
    const prodRootCategory = await prisma.inventoryCategory.findFirst({
      where: { code: prodRootCode, parentId: null, isActive: true }
    });
    if (prodRootCategory) {
      const categories = await prisma.inventoryCategory.findMany({
        where: { isActive: true },
        select: { id: true, parentId: true }
      });
      const descendantIds: string[] = [];
      const collectDescendants = (parentId: string) => {
        categories.forEach(cat => {
          if (cat.parentId === parentId) {
            descendantIds.push(cat.id);
            collectDescendants(cat.id);
          }
        });
      };
      collectDescendants(prodRootCategory.id);
      industryProdCategoryIds = descendantIds;
    }

    // Fetch synced production materials (VTSX)
    const syncedCategories = await prisma.category.findMany({
      where: { type: 'vat_tu_san_xuat', isActive: true },
      select: { id: true, name: true, code: true, parentId: true },
      orderBy: { sortOrder: "asc" }
    });

    const cats = await prisma.inventoryCategory.findMany({
      where: {
        isActive: true,
        ...(industryProdCategoryIds.length > 0 ? { id: { in: industryProdCategoryIds } } : {}),
      },
      orderBy: { sortOrder: "asc" },
      select:  { id: true, name: true, code: true, parentId: true },
    });

    // Create mock parent for VTSX
    const vtsxParentId = "mock-parent-vtsx";
    const vtsxParentNode = {
      id: vtsxParentId,
      name: "Vật tư sản xuất",
      code: "VTSX",
      parentId: null,
    };

    const mappedSyncedCategories = syncedCategories.map(c => ({
      ...c,
      parentId: c.parentId || vtsxParentId
    }));

    // Combine both category sources
    const allCategories = [...cats, vtsxParentNode, ...mappedSyncedCategories];

    return NextResponse.json(allCategories);
  } catch (e) {
    console.error("[GET /inventory/categories]", e);
    return NextResponse.json([]);
  }
}

// POST /api/plan-finance/inventory/categories — thêm mới nhanh
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Tên danh mục không được rỗng" }, { status: 400 });

    // Đọc active_industry_code để gán parentId làm root category của ngành hàng
    const cookieHeader = req.headers.get("cookie") || "";
    let activeIndustryCode = cookieHeader
      .split("; ")
      .find(row => row.startsWith("active_industry_code="))
      ?.split("=")[1];

    if (!activeIndustryCode) {
      const client = await prisma.client.findFirst({
        include: { industry: true }
      });
      if (client?.industry) {
        activeIndustryCode = client.industry.code;
      }
    }

    if (!activeIndustryCode) {
      activeIndustryCode = "sanitary";
    }

    const industryProductCodeMap: Record<string, string> = {
      "sanitary": "SP_VESINH",
      "building_materials": "SP_VLXD"
    };
    const prodRootCode = industryProductCodeMap[activeIndustryCode] || "SP_GO";
    const prodRootCategory = await prisma.inventoryCategory.findFirst({
      where: { code: prodRootCode, parentId: null, isActive: true }
    });

    // Tự sinh code và sortOrder
    const count = await prisma.inventoryCategory.count();
    const code  = "CAT" + String(count + 1).padStart(3, "0");

    const cat = await prisma.inventoryCategory.create({
      data: {
        name: name.trim(),
        code,
        sortOrder: count + 1,
        parentId: prodRootCategory?.id || null,
      },
      select: { id: true, name: true, code: true },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (e) {
    console.error("[POST /inventory/categories]", e);
    return NextResponse.json({ error: "Lỗi tạo danh mục" }, { status: 500 });
  }
}
