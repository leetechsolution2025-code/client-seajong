const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const samples = await prisma.manufacturedProduct.findMany({ where: { productCategoryId: null }, take: 10 });
  console.log("Samples:", samples.map(s => ({ name: s.name, inventoryCategoryId: s.inventoryCategoryId, productCategoryId: s.productCategoryId })));
  
  // also check how many have inventoryCategoryId vs how many don't
  const withInvCat = await prisma.manufacturedProduct.count({ where: { inventoryCategoryId: { not: null } } });
  console.log(`Products with inventoryCategoryId: ${withInvCat}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
