import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const grouped = await prisma.inventoryItem.groupBy({
    by: ['loai'],
    _count: {
      _all: true
    }
  });
  console.log(grouped);
}

main().catch(console.error).finally(() => prisma.$disconnect());
