import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");

    if (!departmentId) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
    }

    // Get all items and join with norms for this department
    const items = await (prisma as any).hrSupplyItem.findMany({
      where: { isActive: true },
      include: {
        category: true,
      }
    });

    const norms = await (prisma as any).hrStationeryNorm.findMany({
      where: { departmentId }
    });

    const normMap: Record<string, any> = {};
    norms.forEach((n: any) => {
      normMap[n.itemId] = n;
    });

    const result = items.map((item: any) => ({
      itemId: item.id,
      itemName: item.name,
      itemCode: item.code,
      categoryName: item.category.name,
      unit: item.unit,
      limitQty: normMap[item.id]?.limitQty || 0,
      limitAmount: normMap[item.id]?.limitAmount || 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET norms error:", error);
    return NextResponse.json({ error: "Failed to fetch norms" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { departmentId, itemId, limitQty } = body;

    const norm = await (prisma as any).hrStationeryNorm.upsert({
      where: {
        departmentId_itemId: {
          departmentId,
          itemId
        }
      },
      update: { limitQty: Number(limitQty) },
      create: {
        departmentId,
        itemId,
        limitQty: Number(limitQty)
      }
    });

    return NextResponse.json(norm);
  } catch (error) {
    console.error("POST norm error:", error);
    return NextResponse.json({ error: "Failed to update norm" }, { status: 500 });
  }
}
