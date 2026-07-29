const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kvp = await prisma.warehouse.findUnique({ where: { code: 'KVP' } });
  if (!kvp) return;

  const items = await prisma.inventoryItem.findMany({
    where: { 
      stocks: { some: { warehouseId: kvp.id } },
      categoryId: null
    }
  });

  const invCats = await prisma.inventoryCategory.findMany();
  // Sort by name length descending so we match longest names first (e.g. "Cần sen cây" before "Sen cây")
  invCats.sort((a, b) => b.name.length - a.name.length);

  let updatedCount = 0;
  for (const item of items) {
    const itemName = item.tenHang.toLowerCase();
    
    for (const cat of invCats) {
      if (itemName.includes(cat.name.toLowerCase())) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { categoryId: cat.id }
        });
        updatedCount++;
        break; // Match found, move to next item
      }
    }
  }

  console.log(`Automatically categorized ${updatedCount} out of ${items.length} items in KVP.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
