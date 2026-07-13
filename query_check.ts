import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const code = 'SJ-HH-NL0039B-MẠ';
  const inv = await prisma.inventoryItem.findUnique({ where: { code } });
  const mat = await (prisma as any).materialItem.findUnique({ where: { code } });
  
  console.log("Is it InventoryItem?", !!inv);
  console.log("Is it MaterialItem?", !!mat);
  
  // also check if there are other items in InventoryItem that the user might be expecting
  const invCount = await prisma.inventoryItem.count();
  console.log("Total InventoryItem records:", invCount);
}

main().finally(() => prisma.$disconnect());
