const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.omnichannelOrder.findMany({
     include: { items: true }
  });
  console.log(orders);
}
main().finally(() => prisma.$disconnect());
