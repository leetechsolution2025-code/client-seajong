const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.saleOrder.findFirst();
  console.log(order);
}
main().finally(() => prisma.$disconnect());
