const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { tenHang: { contains: 'SJ-580D' } }
  });
  console.log(item);
}
main().finally(() => prisma.$disconnect());
