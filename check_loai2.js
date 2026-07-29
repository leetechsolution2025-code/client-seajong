const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.inventoryItem.groupBy({
    by: ['loai'],
    _count: { loai: true }
  });
  console.log(result);
}
main().finally(() => prisma.$disconnect());
