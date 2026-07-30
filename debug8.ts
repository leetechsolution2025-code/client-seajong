import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { tenHang: { contains: "Sen cây truyền thống" } }
  });
  console.log(items);
}

main().catch(console.error).finally(() => prisma.$disconnect());
