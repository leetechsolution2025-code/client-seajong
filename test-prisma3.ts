import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findUnique({ where: { code: "DBH-20260804-07" } });
  console.log("Order exists?", !!order);
}
main();
