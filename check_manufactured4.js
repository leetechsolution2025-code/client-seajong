const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const samples = await prisma.manufacturedProduct.findMany({ 
    where: { categoryId: { not: null } },
    take: 5
  });
  
  for (const s of samples) {
    const invCat = await prisma.inventoryCategory.findUnique({ where: { id: s.categoryId } });
    console.log(`- ${s.name} -> InventoryCat: ${invCat ? invCat.code : 'NOT FOUND'} (${s.categoryId})`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
