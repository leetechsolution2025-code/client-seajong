import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.manufacturedProduct.findMany();
  const withCat = all.filter(x => x.categoryId !== null);
  console.log("ManufacturedProduct count:", all.length);
  console.log("ManufacturedProduct with categoryId count:", withCat.length);
  if (withCat.length > 0) {
     console.log("Sample categoryId:", withCat[0].categoryId);
  }
}
main().finally(() => prisma.$disconnect());
