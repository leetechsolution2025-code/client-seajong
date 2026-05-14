const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.inventoryItem.count({
    where: { webProductId: { not: null } }
  });
  console.log('Count:', count);
  process.exit(0);
}

main();
