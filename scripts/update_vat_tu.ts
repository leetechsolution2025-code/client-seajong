import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.inventoryItem.updateMany({
    where: { erpCategoryId: null },
    data: { loai: 'vat-tu' }
  });
  console.log(`Updated ${result.count} items to vat-tu`);
  
  const result2 = await prisma.inventoryItem.updateMany({
    where: { erpCategoryId: { not: null } },
    data: { loai: 'hang-hoa' }
  });
  console.log(`Updated ${result2.count} items to hang-hoa`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
