import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryCategory.findFirst();
  const item2 = await prisma.category.findFirst();
  console.log("InventoryCategory:", item);
  console.log("Category:", item2);
}

main().catch(console.error).finally(() => prisma.$disconnect());
