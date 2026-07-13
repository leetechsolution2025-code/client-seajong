const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany({ where: { type: 'defects' } });
  console.log("Defect categories:", cats.map(c => c.name));
  
  // check if any material or inventory item uses these categories
  const catIds = cats.map(c => c.id);
  const mats = await prisma.materialItem.count({ where: { categoryId: { in: catIds } } });
  const invs = await prisma.inventoryItem.count({ where: { categoryId: { in: catIds } } });
  const mfps = await prisma.manufacturedProduct.count({ where: { productCategoryId: { in: catIds } } });
  console.log(`Items in defect categories: Materials=${mats}, Inventory=${invs}, Manufactured=${mfps}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
