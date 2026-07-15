import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findUnique({ 
    where: { code: "DHBL-20260714-01" },
    include: { saleOrderItems: { include: { inventoryItem: true } } }
  });
  console.log(JSON.stringify(order?.saleOrderItems, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
