const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kvp = await prisma.warehouse.findUnique({ where: { code: 'KVP' } });
  if (!kvp) return;

  const items = await prisma.inventoryItem.findMany({
    where: { stocks: { some: { warehouseId: kvp.id } } },
    include: { category: true }
  });

  const cats = {};
  for (const item of items) {
    const catName = item.category ? item.category.name : 'Unknown';
    cats[catName] = (cats[catName] || 0) + 1;
  }

  console.log("Categories in KVP:");
  for (const cat in cats) {
    console.log(`- ${cat}: ${cats[cat]} items`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
