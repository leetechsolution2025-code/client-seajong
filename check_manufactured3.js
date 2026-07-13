const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const withCatId = await prisma.manufacturedProduct.count({ where: { categoryId: { not: null } } });
  console.log(`Products with categoryId: ${withCatId}`);
  
  if (withCatId > 0) {
    const samples = await prisma.manufacturedProduct.findMany({ 
      where: { categoryId: { not: null } },
      take: 5,
      include: { category: true }
    });
    console.log("Samples:");
    samples.forEach(s => console.log(`- ${s.name} -> ${s.category?.name} (${s.category?.code})`));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
