const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.saleOrder.findMany({
    select: { id: true, code: true, tongTien: true, createdAt: true, customerId: true },
  });
  console.log("Total orders:", orders.length);
  console.log(orders);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
