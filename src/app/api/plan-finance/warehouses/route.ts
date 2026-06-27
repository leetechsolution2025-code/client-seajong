import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

// GET /api/plan-finance/warehouses
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
      activeIndustryCode = "wood_door";
    }

    let industryProdCategoryIds: string[] = [];
    const industryProductCodeMap: Record<string, string> = {
      "wood_door": "SP_GO",
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

    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        stocks: {
          where: industryProdCategoryIds.length > 0 ? {
            inventoryItem: {
              categoryId: { in: industryProdCategoryIds }
            }
          } : {},
          select: { soLuong: true },
        },
      },
    });

    const result = warehouses.map(w => ({
      id:         w.id,
      code:       w.code,
      name:       w.name,
      address:    w.address,
      phone:      w.phone,
      managerId:  w.managerId,
      isActive:   w.isActive,
      createdAt:  w.createdAt,
      updatedAt:  w.updatedAt,
      soMatHang:  w.stocks.length,
      tongSoLuong: w.stocks.reduce((s, st) => s + st.soLuong, 0),
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /warehouses]", e);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/plan-finance/warehouses
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, code, address, phone, managerId } = body;
    if (!name?.trim()) return NextResponse.json({ error: "Tên kho không được để trống" }, { status: 400 });

    const warehouse = await prisma.warehouse.create({
      data: {
        name:      name.trim(),
        code:      code?.trim() || undefined,
        address:   address?.trim() || undefined,
        phone:     phone?.trim() || undefined,
        managerId: managerId || undefined,
      },
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
