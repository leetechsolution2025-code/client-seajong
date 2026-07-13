import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let activeIndustryCode = "wood_door";
    const user = await prisma.user.findFirst({
      where: { email: session.user?.email || "" },
      include: { client: { include: { industry: true } } }
    });
    
    if (user?.role === "ADMIN") {
      const cookieCode = req.headers.get("cookie")
        ?.split("; ")
        .find(row => row.startsWith("active_industry_code="))
        ?.split("=")[1];
      if (cookieCode) activeIndustryCode = cookieCode;
      else if (user?.client?.industry) activeIndustryCode = user.client.industry.code;
    } else if (user?.client?.industry) {
      activeIndustryCode = user.client.industry.code;
    } else {
      const client = await prisma.client.findFirst({
        include: { industry: true }
      });
      if (client?.industry) activeIndustryCode = client.industry.code;
    }

    const industryProductCodeMap: Record<string, string> = {
      "wood_door": "SP_GO",
      "sanitary": "SP_VESINH",
      "building_materials": "SP_VLXD"
    };
    const prodRootCode = industryProductCodeMap[activeIndustryCode] || "SP_GO";

    const allCategories = await prisma.inventoryCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    });

    const rootNode = allCategories.find(c => c.code === prodRootCode);
    const result: any[] = [];
    if (!rootNode) return NextResponse.json([]);

    const buildTree = (parentId: string | null, level: number) => {
      const children = allCategories.filter(c => c.parentId === parentId);
      children.forEach(cat => {
        const isRootLevel = parentId === rootNode.id;
        const hasChildren = allCategories.some(c => c.parentId === cat.id);
        result.push({
          id: cat.id,
          name: cat.name,
          isHeader: isRootLevel && hasChildren,
          level: level
        });
        buildTree(cat.id, level + 1);
      });
    };

    buildTree(rootNode.id, 0);

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/finance/inventory/categories]", e);
    return NextResponse.json([]);
  }
}
