import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.category.groupBy({
    by: ['type'],
    _count: { type: true }
  });
  console.log("Category types:", types);
}

main().catch(console.error).finally(() => prisma.$disconnect());
