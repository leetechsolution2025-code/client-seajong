const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = 'DHBL-20260713-01';
  let order = await prisma.saleOrder.findUnique({
    where: { id: orderId },
    include: { saleOrderItems: true }
  });
  
  if (!order) {
    order = await prisma.saleOrder.findFirst({
      where: { code: orderId },
      include: { saleOrderItems: true }
    });
  }

  console.log(JSON.stringify(order, null, 2));
}

main();
