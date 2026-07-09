const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const items = await p.inventoryItem.findMany({ where: { webProductId: { not: null } } });
  let count = 0;
  for (const it of items) {
    const web = await p.seajongProduct.findUnique({ where: { id: it.webProductId } });
    if (web && web.price) {
      await p.inventoryItem.update({ where: { id: it.id }, data: { giaBan: web.price } });
      count++;
    }
  }
  console.log('Updated ' + count + ' items in InventoryItem');
  
  const mats = await p.materialItem.findMany({});
  let mCount = 0;
  for (const mat of mats) {
    // If material item has code, we might match it? But materialItem doesn't have webProductId.
  }
}
main();
