const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const orderId = 'DHBL-20260713-01';
    let order = await prisma.saleOrder.findUnique({
      where: { id: orderId },
    });
    console.log(order);
  } catch (e) {
    console.error("ERROR CAUGHT:");
    console.error(e);
  }
}
main();
