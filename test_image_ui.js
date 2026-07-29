const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.saleOrderItem.findFirst({
    where: { tenHang: { contains: 'SJ-580D' } },
    include: { inventoryItem: true }
  });
  console.log("item.inventoryItem:", item.inventoryItem);
}
main().finally(() => prisma.$disconnect());
