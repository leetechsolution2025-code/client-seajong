const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dms = await prisma.dinhMuc.findMany({
    include: { inventoryItem: true }
  });
  
  let count = 0;
  for (const dm of dms) {
    if (!dm.inventoryItemId) continue;
    
    const rows = await prisma.dinhMucVatTu.findMany({
      where: { dinhMucId: dm.id },
      include: { inventoryItem: true }
    });
    
    let totalCost = 0;
    for (const r of rows) {
      if (r.inventoryItem) {
        totalCost += (r.soLuong * r.inventoryItem.giaNhap);
      }
    }
    
    if (totalCost > 0 || dm.giaBan > 0) {
      await prisma.inventoryItem.update({
        where: { id: dm.inventoryItemId },
        data: {
          giaNhap: totalCost > 0 ? totalCost : undefined,
          giaBan: dm.giaBan > 0 ? dm.giaBan : undefined
        }
      });
      count++;
    }
  }
  console.log(`Updated ${count} products with BOM prices.`);
}
main().catch(console.error);
