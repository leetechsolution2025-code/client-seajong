import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.manufacturedProduct.count();
  console.log("ManufacturedProduct count:", count);
}
main().finally(() => prisma.$disconnect());
