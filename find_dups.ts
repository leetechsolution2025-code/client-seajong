import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mfp = await prisma.manufacturedProduct.findMany();
  const inv = await prisma.inventoryItem.findMany();
  
  const mfpNames = new Set(mfp.map(m => m.name.toLowerCase().trim()));
  
  const duplicates = inv.filter(i => i.tenHang && mfpNames.has(i.tenHang.toLowerCase().trim()));
  
  console.log(`Found ${duplicates.length} duplicate InventoryItems out of ${inv.length} total InventoryItems.`);
  if (duplicates.length > 0) {
    console.log("Sample duplicates to delete:");
    console.log(duplicates.slice(0, 5).map(d => `${d.tenHang} (${d.code})`));
  }
}

main().finally(() => prisma.$disconnect());
