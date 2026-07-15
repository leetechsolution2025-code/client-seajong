import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    if (!warehouseId) return NextResponse.json({ error: "Thiếu warehouseId" }, { status: 400 });

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId }
    });
    if (!warehouse) return NextResponse.json({ error: "Không tìm thấy kho hàng" }, { status: 404 });

    const isMaterial = warehouse.type === "MATERIAL";

    // Lấy active_industry_code
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

    if (isMaterial) {
      const rootCodeMap: Record<string, string> = {
        "sanitary": "VTSX_VESINH",
        "building_materials": "VTSX_VLXD"
      };
      const rootCode = rootCodeMap[activeIndustryCode] || "VTSX_GO";
      const root = await prisma.category.findFirst({
        where: { code: rootCode, type: "vat_tu_san_xuat", parentId: null }
      });
      if (!root) return NextResponse.json([]);

      const parents = await prisma.category.findMany({
        where: { parentId: root.id, isActive: true },
        orderBy: { sortOrder: "asc" }
      });

      const parentIds = parents.map(p => p.id);
      const children = await prisma.category.findMany({
        where: { parentId: { in: parentIds }, isActive: true },
        orderBy: { sortOrder: "asc" }
      });

      const result = parents.map(p => ({
        id: p.id,
        name: p.name,
        children: children.filter(c => c.parentId === p.id).map(c => ({
          id: c.id,
          name: c.name
        }))
      })).filter(p => p.children.length > 0);

      return NextResponse.json(result);
    } else {
      const rootCodeMap: Record<string, string> = {
        "sanitary": "SP_VESINH",
        "building_materials": "SP_VLXD"
      };
      const rootCode = rootCodeMap[activeIndustryCode] || "SP_GO";
      const root = await prisma.inventoryCategory.findFirst({
        where: { code: rootCode, parentId: null, isActive: true }
      });
      if (!root) return NextResponse.json([]);

      const parents = await prisma.inventoryCategory.findMany({
        where: { parentId: root.id, isActive: true },
        orderBy: { sortOrder: "asc" }
      });

      const parentIds = parents.map(p => p.id);
      const children = await prisma.inventoryCategory.findMany({
        where: { parentId: { in: parentIds }, isActive: true },
        orderBy: { sortOrder: "asc" }
      });

      const result = parents.map(p => ({
        id: p.id,
        name: p.name,
        children: children.filter(c => c.parentId === p.id).map(c => ({
          id: c.id,
          name: c.name
        }))
      })).filter(p => p.children.length > 0);

      return NextResponse.json(result);
    }
  } catch (e: unknown) {
    console.error("[GET /reports/categories]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
