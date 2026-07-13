import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const mfpCount = await prisma.manufacturedProduct.count();
  console.log("ManufacturedProduct count:", mfpCount);
}
main().finally(() => prisma.$disconnect());
