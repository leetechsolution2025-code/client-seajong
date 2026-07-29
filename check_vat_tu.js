const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.inventoryItem.groupBy({
    by: ['categoryId'],
    where: { loai: 'vat-tu' },
    _count: { _all: true }
  });
  console.log('Categories for vat-tu:', categories.length);
  const nullCount = categories.find(c => c.categoryId === null);
  console.log('Null category:', nullCount ? nullCount._count._all : 0);
  
  // get category names
  const validIds = categories.filter(c => c.categoryId).map(c => c.categoryId);
  const cats = await prisma.category.findMany({ where: { id: { in: validIds } } });
  cats.forEach(c => {
    const count = categories.find(x => x.categoryId === c.id)._count._all;
    console.log(`Cat ${c.name}: ${count}`);
  });
}
main().finally(() => prisma.$disconnect());
