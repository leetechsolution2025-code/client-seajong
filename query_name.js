const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { tenHang: { contains: 'Chân sen inox có vít CS06' } }
  });
  console.log("Item:", item);
}

main().catch(console.error).finally(() => prisma.$disconnect());
