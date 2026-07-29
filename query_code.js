const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { code: { startsWith: 'nsp-' } },
    select: { code: true, tenHang: true }
  });
  console.log("Items with code nsp-:", items.length);
}
main().finally(() => prisma.$disconnect());
