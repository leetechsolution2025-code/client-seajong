const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.saleOrder.findUnique({
    where: { code: 'DBH-20260809-02' }
  });
  console.log(order);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
