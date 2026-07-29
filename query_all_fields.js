const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { code: 'HSC05' },
    include: {
      erpCategory: true,
      category: true,
    }
  });
  console.log(item);
}
main().finally(() => prisma.$disconnect());
