const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cat = await prisma.category.findUnique({ where: { id: 'cmr8oi3vo001g8ot0kpa84ywx' } });
  console.log("Is it a Category?", cat ? cat.name : "No");
  
  // also group all products by categoryId and see how many there are for each!
  const groups = await prisma.manufacturedProduct.groupBy({
    by: ['categoryId'],
    _count: true
  });
  
  console.log("Groups by categoryId:");
  for (const g of groups) {
    if (!g.categoryId) continue;
    // let's check BOTH tables to see what this ID belongs to
    const invCat = await prisma.inventoryCategory.findUnique({ where: { id: g.categoryId } });
    const normalCat = await prisma.category.findUnique({ where: { id: g.categoryId } });
    
    console.log(`- ${g.categoryId} -> Count: ${g._count}. InvCat: ${invCat?.code}, NormalCat: ${normalCat?.code}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
