import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAutoJournalByReference } from "@/lib/accounting-engine";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    if (!warehouseId) {
      return NextResponse.json({ error: "Thiếu ID kho" }, { status: 400 });
    }

    // Lấy danh sách item trong kho
    const stocks = await prisma.inventoryStock.findMany({
      where: { warehouseId }
    });

    const itemIds = stocks.map(s => s.inventoryItemId);

    if (itemIds.length === 0) {
      return NextResponse.json({ ok: true, message: "Kho rỗng" });
    }

    // Xoá stock movement liên quan đến kho này
    await prisma.stockMovement.deleteMany({
      where: { toWarehouseId: warehouseId }
    });
    
    await prisma.stockMovement.deleteMany({
      where: { fromWarehouseId: warehouseId }
    });

    // Xoá stock
    await prisma.inventoryStock.deleteMany({
      where: { warehouseId }
    });

    // Lấy các item bị mồ côi (không nằm ở kho nào nữa) để xoá hẳn
    const orphanedItems = await prisma.inventoryItem.findMany({
      where: {
        id: { in: itemIds },
        stocks: { none: {} }
      },
      select: { id: true, code: true }
    });

    const orphanedItemIds = orphanedItems.map(i => i.id);

    // Xoá auto journal
    for (const item of orphanedItems) {
      if (item.code) {
        await deleteAutoJournalByReference(item.code, "Xoá mã hàng hoá");
      }
    }

    // Xoá liên kết định mức vật tư
    await prisma.dinhMucVatTu.updateMany({
      where: { inventoryItemId: { in: orphanedItemIds } },
      data: { inventoryItemId: null }
    });

    // Cuối cùng xoá các items mồ côi
    if (orphanedItemIds.length > 0) {
      await prisma.inventoryItem.deleteMany({
        where: { id: { in: orphanedItemIds } }
      });
    }

    return NextResponse.json({ ok: true, deletedCount: itemIds.length });
  } catch (error: any) {
    console.error("Clear warehouse error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
