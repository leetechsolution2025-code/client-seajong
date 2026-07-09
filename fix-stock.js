const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const thanhPhamWh = await prisma.warehouse.findFirst({ where: { code: 'KHO-THANHPHAM' } });
  const hangHoaWh = await prisma.warehouse.findFirst({ where: { code: 'KHO-CHINH' } });
  
  if (!thanhPhamWh || !hangHoaWh) {
    console.log("Missing warehouses!");
    return;
  }
  
  // Find all items that have a webProductId (meaning they came from sync)
  const webItems = await prisma.inventoryItem.findMany({
    where: { webProductId: { not: null } },
    select: { id: true }
  });
  
  const webItemIds = webItems.map(i => i.id);
  console.log(`Found ${webItemIds.length} items synced from web.`);
  
  // Update inventoryStock for these items from KHO-THANHPHAM to KHO-CHINH
  const updateResult = await prisma.inventoryStock.updateMany({
    where: {
      warehouseId: thanhPhamWh.id,
      inventoryItemId: { in: webItemIds }
    },
    data: {
      warehouseId: hangHoaWh.id
    }
  });
  
  console.log(`Moved ${updateResult.count} stock records from KHO-THANHPHAM to KHO-CHINH.`);
}
main().finally(() => prisma.$disconnect());
