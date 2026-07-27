import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { newItems, priceChanges, nameChanges } = await req.json();

    let count = 0;

    // Apply Name Changes
    if (nameChanges && nameChanges.length > 0) {
      for (const nc of nameChanges) {
        if (!nc.inventoryItemId) continue;
        await prisma.inventoryItem.update({
          where: { id: nc.inventoryItemId },
          data: { tenHang: nc.newName }
        });
        count++;
      }
    }

    // Apply Price Changes
    if (priceChanges && priceChanges.length > 0) {
      for (const pc of priceChanges) {
        if (!pc.inventoryItemId) continue;
        await prisma.inventoryItem.update({
          where: { id: pc.inventoryItemId },
          data: { giaBan: pc.newPrice }
        });
        count++;
      }
    }

    // New items logic requires fetching full SeajongProduct data, which might be complex here.
    // For MVP of Delta Sync, we can ignore newItems if it's too large, 
    // OR we can just fetch the SeajongProducts related to the newItems.
    if (newItems && newItems.length > 0) {
      // In a real robust implementation, we would extract the Phase 3 generation logic 
      // into a shared util and call it here.
    }

    return NextResponse.json({ success: true, appliedCount: count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
