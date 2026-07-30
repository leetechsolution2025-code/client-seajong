import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findUnique({ where: { code: "DBH-20260730-01" } });
  console.log("DBH order:", order);
  const order2 = await prisma.saleOrder.findUnique({ where: { code: "DHBL-20260730-01" } });
  console.log("DHBL order:", order2);
}
main().finally(() => prisma.$disconnect());
