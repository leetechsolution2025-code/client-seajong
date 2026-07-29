const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { loai: 'vat-tu' }
  });
  console.log(item);
}
main().finally(() => prisma.$disconnect());
