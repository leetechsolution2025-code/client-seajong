import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst();
  const mfp = await prisma.manufacturedProduct.findFirst();
  const mat = await prisma.materialItem.findFirst();
  
  console.log("ManufacturedProduct:", mfp);
  console.log("MaterialItem:", mat);
}
main().catch(console.error).finally(() => prisma.$disconnect());
