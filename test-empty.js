const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invs = await prisma.inventoryItem.findMany();
  console.log("Inventory items count:", invs.length);
  
  const mats = await prisma.materialItem.findMany();
  console.log("Material items count:", mats.length);
  
  const stocks = await prisma.materialStock.findMany({ include: { material: true } });
  console.log("Material stocks count:", stocks.length);
  
  const retail = await prisma.retailInvoiceItem.findMany();
  console.log("Retail invoice items count:", retail.length);
}
main().finally(() => prisma.$disconnect());
