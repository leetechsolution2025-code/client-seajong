const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.inventoryItem.count();
  console.log("Total InventoryItem:", c);
}
main().catch(console.error).finally(() => prisma.$disconnect());
