const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cat = await prisma.category.findFirst({
    where: { name: { contains: 'Lavabo OEM' } }
  });
  console.log(cat);
  
  if (cat) {
    const items = await prisma.inventoryItem.findMany({
      where: { categoryId: cat.id }
    });
    console.log(`Found ${items.length} items for this category.`);
    if (items.length > 0) {
      console.log('Sample item loai:', items[0].loai);
    }
  }
}
main().finally(() => prisma.$disconnect());
