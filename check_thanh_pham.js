const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c1 = await prisma.inventoryItem.findMany({
    where: { loai: 'thanh-pham' }
  });
  console.log('Thanh pham:', c1.length);
  
  // Try to find if they were migrated as 'thanh-pham' or something else
  const types = await prisma.inventoryItem.groupBy({
    by: ['loai']
  });
  console.log('All types:', types);
}
main().finally(() => prisma.$disconnect());
