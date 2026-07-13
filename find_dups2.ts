import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mfp = await prisma.manufacturedProduct.findMany({ where: { name: { contains: "35" } } });
  const inv = await prisma.inventoryItem.findMany({ where: { tenHang: { contains: "35" } } });
  
  console.log("MFP (Kho TP):");
  mfp.forEach(m => console.log(`- [${m.code}] ${m.name}`));
  
  console.log("\nINV (Kho HH):");
  inv.forEach(i => console.log(`- [${i.code}] ${i.tenHang}`));
}

main().finally(() => prisma.$disconnect());
