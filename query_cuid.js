const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: 'cmru97xqk00kbi0jdogzbq69f' }
  });
  console.log("Item:", item);
}

main().catch(console.error).finally(() => prisma.$disconnect());
