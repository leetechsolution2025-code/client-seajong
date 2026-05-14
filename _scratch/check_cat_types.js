const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.categoryTypeDef.findMany();
  console.log('Category Types:', types);
  
  const allCats = await prisma.category.findMany();
  console.log('All Categories:', allCats.map(c => ({ id: c.id, type: c.type, name: c.name })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
