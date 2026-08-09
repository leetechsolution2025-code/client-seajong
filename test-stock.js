const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const code = "03S";
  const items = await prisma.inventoryItem.findMany({
    where: { OR: [{ code: { contains: code } }, { tenHang: { contains: code } }] },
    include: { stocks: true }
  });
  console.log(JSON.stringify(items, null, 2));
}
main().finally(() => prisma.$disconnect());
