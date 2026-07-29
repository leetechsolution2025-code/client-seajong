const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const khoChinh = await prisma.warehouse.findUnique({ where: { code: 'KHO-CHINH' } });
  const kvp = await prisma.warehouse.findUnique({ where: { code: 'KVP' } });

  if (!khoChinh || !kvp) {
    console.log("Missing warehouses");
    return;
  }

  console.log("Assigning Commercial items to KHO-CHINH...");
  const commercialItems = await prisma.inventoryItem.findMany({
    where: { loai: { in: ['thanh-pham', 'hang-hoa'] } }
  });

  for (const item of commercialItems) {
    await prisma.inventoryStock.upsert({
      where: {
        inventoryItemId_warehouseId: {
          inventoryItemId: item.id,
          warehouseId: khoChinh.id
        }
      },
      update: {},
      create: {
        inventoryItemId: item.id,
        warehouseId: khoChinh.id,
        soLuong: item.soLuong || 0
      }
    });
  }

  console.log("Assigning Material items to KVP...");
  const materialItems = await prisma.inventoryItem.findMany({
    where: { loai: 'vat-tu' }
  });

  for (const item of materialItems) {
    await prisma.inventoryStock.upsert({
      where: {
        inventoryItemId_warehouseId: {
          inventoryItemId: item.id,
          warehouseId: kvp.id
        }
      },
      update: {},
      create: {
        inventoryItemId: item.id,
        warehouseId: kvp.id,
        soLuong: item.soLuong || 0
      }
    });
  }

  console.log(`Assigned ${commercialItems.length} items to KHO-CHINH and ${materialItems.length} items to KVP.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
