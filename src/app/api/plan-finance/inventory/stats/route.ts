import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plan-finance/inventory/stats
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
      const descendantIds = [prodRootCategory.id];
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

    const whereClause = industryProdCategoryIds.length > 0 ? {
      categoryId: { in: industryProdCategoryIds }
    } : {};

    const [all, sapHet, hetHang, categories] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: whereClause,
        select: { soLuong: true, giaNhap: true, giaBan: true, trangThai: true },
      }),
      prisma.inventoryItem.count({
        where: {
          ...whereClause,
          trangThai: "sap-het",
        },
      }),
      prisma.inventoryItem.count({
        where: {
          ...whereClause,
          trangThai: "het-hang",
        },
      }),
      prisma.inventoryCategory.findMany({
        where: {
          isActive: true,
          ...(industryProdCategoryIds.length > 0 ? { id: { in: industryProdCategoryIds } } : {}),
        },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { items: true } },
          items: {
            select: { soLuong: true, giaNhap: true, giaBan: true },
          },
        },
      }),
    ]);

    const tongMatHang = all.length;
    const tongGiaTri  = all.reduce((s: number, it: { soLuong: number; giaNhap: number; giaBan: number }) => s + it.soLuong * (it.giaNhap || it.giaBan || 0), 0);
    type CatRaw = { name: string; _count: { items: number }; items: { soLuong: number; giaNhap: number; giaBan: number }[] };
    const categoryStats = categories.map((c: CatRaw) => ({
      label: c.name,
      value: c._count.items,
    }));
    const categoryValueStats = categories.map((c: CatRaw) => ({
      label: c.name,
      value: Math.round(c.items.reduce((s, it) => s + it.soLuong * (it.giaNhap || it.giaBan || 0), 0)),
    }));

    return NextResponse.json({ tongMatHang, tongGiaTri, sapHet, hetHang, categoryStats, categoryValueStats });
  } catch (e) {
    console.error("[GET /inventory/stats]", e);
    return NextResponse.json({ tongMatHang: 0, tongGiaTri: 0, sapHet: 0, hetHang: 0 });
  }
}
