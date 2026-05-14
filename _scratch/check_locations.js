const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    where: { type: 'LOCATION' }
  });
  console.log('Location Categories:', categories);
  
  const branches = await prisma.branch.findMany();
  console.log('Branches:', branches);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
