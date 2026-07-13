import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const inv = await prisma.inventoryItem.findMany();
  inv.filter(x => x.tenHang.toLowerCase().includes("sen")).forEach(i => console.log(`[INV] [${i.code}] ${i.tenHang}`));
}
main().finally(() => prisma.$disconnect());
