const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { tenHang: { contains: 'Lavabo' } },
    take: 5,
    include: { category: true }
  });
  items.forEach(i => console.log('Item:', i.code, 'cat:', i.category?.name, i.category?.code));
}
main().finally(() => prisma.$disconnect());
