import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { OR: [{ code: { contains: "01S" } }, { tenHang: { contains: "01S" } }] },
    include: { stocks: true }
  });
  console.log(JSON.stringify(items, null, 2));
}
main().finally(() => prisma.$disconnect());
