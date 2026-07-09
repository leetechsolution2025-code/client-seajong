const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.omnichannelOrderItem.findMany({
    take: 2,
    include: { inventoryItem: true }
  });
  console.log(items);
}
main().finally(() => prisma.$disconnect());
