const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.stockCount.count();
  console.log("Count:", c);
}
main().finally(() => prisma.$disconnect());
