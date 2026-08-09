const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mv = await prisma.stockMovement.findMany({
    where: { inventoryItem: { code: 'VG-03S' } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(mv, null, 2));
}
main().finally(() => prisma.$disconnect());
