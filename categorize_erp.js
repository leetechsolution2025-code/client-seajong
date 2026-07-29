const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kvp = await prisma.warehouse.findUnique({ where: { code: 'KVP' } });
  if (!kvp) return;

  const items = await prisma.inventoryItem.findMany({
    where: { stocks: { some: { warehouseId: kvp.id } } }
  });

  const erpCats = await prisma.category.findMany({
    where: { type: 'vat_tu_san_xuat' }
  });
  erpCats.sort((a, b) => b.name.length - a.name.length);

  let updatedCount = 0;
  for (const item of items) {
    const itemName = item.tenHang.toLowerCase();
    
    for (const cat of erpCats) {
      if (itemName.includes(cat.name.toLowerCase())) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { erpCategoryId: cat.id }
        });
        updatedCount++;
        break;
      }
    }
  }

  console.log(`Automatically mapped erpCategoryId for ${updatedCount} out of ${items.length} items in KVP.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
