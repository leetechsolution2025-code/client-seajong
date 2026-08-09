const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.saleOrder.findMany({
    where: { keToanDuyet: "approved" },
    include: { logisticsTickets: true }
  });
  console.log(JSON.stringify(orders.slice(0, 2), null, 2));
}
main().finally(() => prisma.$disconnect());
