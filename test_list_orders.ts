import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const orders = await prisma.saleOrder.findMany({ 
    where: { code: { contains: "DHBL" } }, 
    include: { saleOrderItems: { include: { inventoryItem: true } } } 
  });
  console.log("SaleOrders:", JSON.stringify(orders, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
