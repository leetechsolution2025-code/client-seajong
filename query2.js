const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findUnique({where: {id: 'cmsebtwli000f8o1y4f73bh1a'}});
  console.log('Order:', order.code);
}
main().finally(() => prisma.$disconnect());
