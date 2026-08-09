const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.saleOrder.findUnique({
    where: { id: "cmslp2ihp00248o10akjn6q79" },
    include: { saleOrderItems: { include: { inventoryItem: true } } }
  });
  console.log(JSON.stringify(o, null, 2));
}
main().finally(() => prisma.$disconnect());
