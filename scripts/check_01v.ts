import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { code: '01V' },
  });
  console.log("01V:", item?.categoryId, item?.erpCategoryId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
