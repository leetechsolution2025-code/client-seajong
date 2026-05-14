import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch stationery items from HrSupplyItem that are marked as assets and have stock
    const assets = await (prisma as any).hrSupplyItem.findMany({
      where: {
        isActive: true,
        isAsset: true,
        currentStock: { gt: 0 }
      },
      select: {
        id: true,
        name: true,
        code: true,
        category: {
          select: { name: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const formattedAssets = assets.map((a: any) => ({
      id: a.id,
      tenTaiSan: a.name,
      code: a.code,
      category: a.category.name
    }));

    return NextResponse.json(formattedAssets);
  } catch (error) {
    console.error("GET available assets error:", error);
    return NextResponse.json({ error: "Failed to fetch available assets" }, { status: 500 });
  }
}
