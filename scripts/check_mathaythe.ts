import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { maThayThe: 'nsp-st-01' },
    select: { code: true, tenHang: true, maThayThe: true }
  });
  console.log("Items with maThayThe = 'nsp-st-01':", items.length);
  console.log(items);
}

main().catch(console.error).finally(() => prisma.$disconnect());
