import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany();
  
  let fixedCount = 0;
  for (const item of items) {
    let newCatId = item.categoryId;
    let newErpCatId = item.erpCategoryId;
    let changed = false;

    // Check if categoryId actually belongs to Category (internal)
    if (item.categoryId) {
      const isInternal = await prisma.category.findUnique({ where: { id: item.categoryId } });
      if (isInternal) {
        newErpCatId = item.categoryId;
        newCatId = null;
        changed = true;
      }
    }

    // Check if erpCategoryId actually belongs to InventoryCategory (web sync)
    if (item.erpCategoryId) {
      const isWeb = await prisma.inventoryCategory.findUnique({ where: { id: item.erpCategoryId } });
      if (isWeb) {
        newCatId = item.erpCategoryId;
        newErpCatId = null;
        changed = true;
      }
    }

    if (changed) {
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          categoryId: newCatId,
          erpCategoryId: newErpCatId
        }
      });
      fixedCount++;
      console.log(`Fixed item ${item.code}: categoryId -> ${newCatId}, erpCategoryId -> ${newErpCatId}`);
    }
  }
  console.log(`Finished fixing ${fixedCount} items.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
