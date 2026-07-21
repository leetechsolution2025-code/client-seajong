import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mfps = await prisma.manufacturedProduct.findMany();
  console.log("ManufacturedProduct count:", mfps.length);
  const items = await prisma.inventoryItem.findMany();
  console.log("InventoryItem count:", items.length);
  
  // Show a few manufactured products
  console.log("MFPs:", mfps.slice(0, 3).map(m => ({ id: m.id, code: m.code, name: m.name })));
}
main();
