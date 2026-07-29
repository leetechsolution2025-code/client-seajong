const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { tenHang: { contains: 'SJ-580D' } }
  });
  console.log("InventoryItems:");
  for (let item of items) {
     console.log(`- ID: ${item.id}, Code: ${item.code}, webProductId: ${item.webProductId}, imageUrl: ${item.imageUrl}`);
  }
}
main().finally(() => prisma.$disconnect());
