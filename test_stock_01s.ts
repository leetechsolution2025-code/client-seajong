import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { code: 'CSC01S' },
    include: { stocks: true }
  });
  console.log(item?.stocks);
}
main().catch(console.error).finally(() => prisma.$disconnect());
