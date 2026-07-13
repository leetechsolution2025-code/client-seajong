import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mfp = await prisma.manufacturedProduct.findMany();
  const inv = await prisma.inventoryItem.findMany();
  
  const mfpCodes = new Set(mfp.map(m => m.code?.toLowerCase().trim()).filter(Boolean));
  const mfpNames = new Set(mfp.map(m => m.name?.toLowerCase().trim()).filter(Boolean));
  
  const dupsByCode = inv.filter(i => i.code && mfpCodes.has(i.code.toLowerCase().trim()));
  const dupsByName = inv.filter(i => i.tenHang && mfpNames.has(i.tenHang.toLowerCase().trim()));
  
  console.log(`Dups by code: ${dupsByCode.length}`);
  console.log(`Dups by name: ${dupsByName.length}`);
  
  if (dupsByCode.length > 0) {
    console.log("Sample code dups:", dupsByCode.slice(0, 3).map(x => x.code));
  }
}
main().finally(() => prisma.$disconnect());
