const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      saleOrderItems: {
        include: {
          inventoryItem: {
            include: { dinhMuc: { include: { vatTu: true } } }
          }
        }
      }
    }
  });
  console.log(JSON.stringify(order, null, 2).substring(0, 2000));
}
main();
