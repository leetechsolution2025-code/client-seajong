import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const catId = 'cmr8oi3vo001g8ot0kpa84ywx';
  const icat = await prisma.inventoryCategory.findUnique({ where: { id: catId } });
  console.log("InventoryCategory:", !!icat, icat?.name);
  const scat = await prisma.seajongCategory.findUnique({ where: { id: catId } });
  console.log("SeajongCategory:", !!scat, scat?.name);
}
main().finally(() => prisma.$disconnect());
