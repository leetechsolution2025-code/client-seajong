const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kvp = await prisma.warehouse.findUnique({ where: { code: 'KVP' } });
  if (!kvp) return;

  const items = await prisma.inventoryItem.findMany({
    where: { stocks: { some: { warehouseId: kvp.id } } }
  });

  const catIds = {};
  for (const item of items) {
    const cid = item.categoryId || 'NULL';
    catIds[cid] = (catIds[cid] || 0) + 1;
  }

  console.log("Category IDs in KVP items:");
  for (const cid in catIds) {
    console.log(`- ${cid}: ${catIds[cid]} items`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
