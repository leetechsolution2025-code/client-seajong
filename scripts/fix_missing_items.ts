import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: {
      loai: 'vat-tu',
      code: { not: null }
    }
  });
  
  let count = 0;
  for (const item of items) {
    if (item.code && (item.code.startsWith('CSC') || item.code.startsWith('VG') || item.code === '01S')) {
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { loai: 'thanh-pham' }
      });
      count++;
      console.log(`Restored item ${item.code} to thanh-pham`);
    }
  }
  console.log(`Successfully restored ${count} items.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
