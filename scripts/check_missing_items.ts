import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: {
      imageUrl: { not: null }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  });
  console.log("Recently updated items with images:");
  items.forEach(it => {
    console.log(`- ID: ${it.id}, Code: ${it.code}, Name: ${it.tenHang}, Loai: ${it.loai}, CategoryId: ${it.categoryId}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
