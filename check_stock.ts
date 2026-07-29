import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const invItems = await prisma.inventoryItem.findMany({ take: 5 });
  console.log("Samples of InventoryItems:");
  console.dir(invItems, { depth: null });

  const matStock = await prisma.materialStock.findMany({ take: 5 });
  console.log("Samples of MaterialStock:");
  console.dir(matStock, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
