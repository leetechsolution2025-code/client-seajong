const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.omnichannelOrder.findMany({});
  console.log("OmnichannelOrder count:", orders.length);
  const items = await prisma.omnichannelOrderItem.findMany({});
  console.log("OmnichannelOrderItem count:", items.length);
}
main().finally(() => prisma.$disconnect());
