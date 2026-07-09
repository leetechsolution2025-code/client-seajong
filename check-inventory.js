const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { tenHang: { contains: 'VL0902' } }
  });
  console.log("Inventory Item:", item);
}
main().finally(() => prisma.$disconnect());
