import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [pendingCount, lowStockItems, assetsInUse] = await Promise.all([
      (prisma as any).hrSupplyRequest.count({
        where: {
          status: { in: ["PENDING", "OVER_NORM"] }
        }
      }),
      // SQLite/Prisma don't support comparing 2 columns directly in count easily
      // We fetch and filter in JS for accuracy and to avoid IDE errors
      (prisma as any).hrSupplyItem.findMany({
        where: { isActive: true },
        select: { currentStock: true, minStock: true }
      }),
      (prisma as any).hrAssetHandover.count({
        where: { status: "USING" }
      })
    ]);

    const lowStockCount = lowStockItems.filter((i: any) => i.currentStock < i.minStock).length;

    const items = await (prisma as any).hrSupplyItem.findMany({ 
      where: { isActive: true },
      select: { currentStock: true, price: true } 
    });
    const totalValue = items.reduce((acc: number, item: any) => acc + (item.currentStock * item.price), 0);

    return NextResponse.json({
      pendingCount,
      lowStockCount,
      totalValue,
      assetsInUse
    });
  } catch (error) {
    console.error("[STATIONERY_STATS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
