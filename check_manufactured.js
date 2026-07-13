const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const categories = await prisma.category.findMany({ where: { type: 'danh_muc_thanh_pham' } });
  
  for (const cat of categories) {
    const count = await prisma.manufacturedProduct.count({ where: { productCategoryId: cat.id } });
    console.log(`${cat.name} (${cat.code}): ${count} products`);
  }
  
  const unassigned = await prisma.manufacturedProduct.count({ where: { productCategoryId: null } });
  console.log(`Unassigned products: ${unassigned}`);
  
  // also check if there are any products linked to InventoryCategory instead?
  const total = await prisma.manufacturedProduct.count();
  console.log(`Total manufactured products: ${total}`);
  
  // print a few unassigned to see what they are
  if (unassigned > 0) {
    const samples = await prisma.manufacturedProduct.findMany({ where: { productCategoryId: null }, take: 5 });
    console.log("Samples:", samples.map(s => ({ name: s.name, sku: s.sku })));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
