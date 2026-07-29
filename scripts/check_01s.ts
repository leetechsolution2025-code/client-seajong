import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { code: '01S' },
    include: {
      category: true,
      erpCategory: true,
      stocks: true,
    }
  });
  console.log(JSON.stringify(item, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
