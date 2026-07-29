const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.saleOrder.findMany({
    where: { code: { in: ['DBH-20260728-01', 'DBH-20260728-02'] } },
    select: { code: true, ngayGiao: true }
  });
  console.log(orders);
}

main().catch(console.error).finally(() => prisma.$disconnect());
