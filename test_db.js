const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.inventoryItem.groupBy({
    by: ['loai'],
    _count: { loai: true }
  });
  console.log("Counts by loai:", counts);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
