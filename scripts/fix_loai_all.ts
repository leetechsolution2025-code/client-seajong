import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.inventoryItem.updateMany({
    where: {
      loai: { in: ['thanh-pham', 'vat-tu'] }
    },
    data: {
      loai: 'hang-hoa'
    }
  });
  console.log(`Updated ${result.count} items to loai 'hang-hoa'`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
