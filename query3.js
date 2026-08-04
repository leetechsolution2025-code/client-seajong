const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findUnique({where: {code: 'DBH-20260804-02'}});
  if (order) {
    const notifs = await prisma.paymentNotification.findMany({where: {saleOrderId: order.id}});
    console.log('Notifs for DBH-20260804-02:', notifs);
  } else {
    console.log('Order not found');
  }
}
main().finally(() => prisma.$disconnect());
