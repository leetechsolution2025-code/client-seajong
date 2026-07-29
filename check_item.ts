import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.inventoryItem.findFirst({ where: { code: 'VG-01S' } });
  if (item) {
    const movements = await prisma.stockMovement.findMany({ where: { inventoryItemId: item.id } });
    console.log(`Movements for ${item.code}:`, movements);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
