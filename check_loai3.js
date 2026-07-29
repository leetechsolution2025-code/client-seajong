const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c1 = await prisma.inventoryItem.count({
    where: { loai: 'hang-hoa', webProductId: null }
  });
  const c2 = await prisma.inventoryItem.count({
    where: { loai: 'hang-hoa', webProductId: { not: null } }
  });
  console.log(`hang-hoa without webProductId: ${c1}`);
  console.log(`hang-hoa with webProductId: ${c2}`);
}
main().finally(() => prisma.$disconnect());
