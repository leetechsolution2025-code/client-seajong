import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    let itemIds: string[] = [];
    try {
      const body = await req.json();
      if (body && Array.isArray(body.itemIds)) {
        itemIds = body.itemIds;
      }
    } catch {
      // No JSON body provided
    }

    // Build filter for InventoryStock
    const stockWhere: any = {
      soLuongGiu: { not: 0 }
    };

    if (warehouseId) {
      stockWhere.warehouseId = warehouseId;
    }

    if (itemIds && itemIds.length > 0) {
      stockWhere.inventoryItemId = { in: itemIds };
    }

    // 1. Delete associated reservations
    const reservationWhere: any = {};
    if (warehouseId || (itemIds && itemIds.length > 0)) {
      reservationWhere.inventoryStock = {
        ...(warehouseId ? { warehouseId } : {}),
        ...(itemIds && itemIds.length > 0 ? { inventoryItemId: { in: itemIds } } : {})
      };
    }
    await prisma.inventoryReservation.deleteMany({
      where: reservationWhere
    });

    // 2. Reset soLuongGiu = 0 for matching stocks
    const updateResult = await prisma.inventoryStock.updateMany({
      where: stockWhere,
      data: {
        soLuongGiu: 0
      }
    });

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.count
    });
  } catch (error: any) {
    console.error("Clear holds error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống" }, { status: 500 });
  }
}
