const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const mfp = await prisma.manufacturedProduct.findFirst({ where: { name: { contains: "rumine" } } });
  console.log("MFP:", mfp);
  const inv = await prisma.inventoryItem.findFirst({ where: { tenHang: { contains: "rumine" } } });
  console.log("INV:", inv);
}
main().catch(console.error).finally(() => prisma.$disconnect());
