const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findFirst({ where: { code: 'DHBL-20260708-01' }, include: { saleOrderItems: true } });
  console.log(JSON.stringify(order, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
