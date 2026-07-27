import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const orderId = "cms1m26we001h8ogf8049fu5a";
  const order = await prisma.saleOrder.findUnique({
    where: { id: orderId },
    include: { saleOrderItems: true }
  });
  console.log("Order items:");
  order?.saleOrderItems.forEach(i => console.log(i));
}
main().catch(console.error).finally(() => prisma.$disconnect());
