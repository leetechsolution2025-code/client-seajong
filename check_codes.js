const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.manufacturedProduct.findMany({ select: { name: true, code: true } });
  for(let i=0; i<15; i++) {
     console.log(`${products[i].code} : ${products[i].name}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
