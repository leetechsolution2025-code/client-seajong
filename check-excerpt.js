const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.seajongProduct.findMany({
    where: { name: { contains: 'BỒN' } },
    select: { name: true, excerpt: true }
  });
  console.log(products);
}
main().finally(() => prisma.$disconnect());
