const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const name = "Thân sen 10";
  const inv = await prisma.inventoryItem.findMany({ where: { tenHang: { contains: "Thân sen 10" } }, include: { stocks: true } });
  const mfp = await prisma.manufacturedProduct.findMany({ where: { name: { contains: "Thân sen 10" } } });
  const mat = await prisma.materialItem.findMany({ where: { name: { contains: "Thân sen 10" } }, include: { stocks: true } });
  
  console.log("InventoryItem:", JSON.stringify(inv, null, 2));
  console.log("ManufacturedProduct:", JSON.stringify(mfp, null, 2));
  console.log("MaterialItem:", JSON.stringify(mat, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
