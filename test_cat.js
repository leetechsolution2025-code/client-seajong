const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getCategoryIdsRecursive(categoryId) {
  const categories = await prisma.category.findMany();
  const resultIds = [categoryId];
  const collectDescendants = (parentId) => {
    categories.forEach(cat => {
      if (cat.parentId === parentId) {
        resultIds.push(cat.id);
        collectDescendants(cat.id);
      }
    });
  };
  collectDescendants(categoryId);
  return resultIds;
}

async function main() {
  const cat = await prisma.category.findFirst({
    where: { name: { contains: 'Lavabo OEM' } }
  });
  if (cat) {
    console.log('Category:', cat.name);
    const ids = await getCategoryIdsRecursive(cat.id);
    console.log('Ids:', ids.length);
    const items = await prisma.inventoryItem.findMany({
      where: { categoryId: { in: ids } }
    });
    console.log('Items found:', items.length);
    if (items.length > 0) {
      console.log('Sample item:', items[0].tenHang, 'loai:', items[0].loai);
    }
  }
}
main().finally(() => prisma.$disconnect());
