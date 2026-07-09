const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const wh = await prisma.warehouse.findMany();
  console.log(wh);
}
main().finally(() => prisma.$disconnect());
