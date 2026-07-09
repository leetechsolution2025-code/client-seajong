const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.saleOrder.findUnique({
    where: { id: "cmrc8t9r4010pgrn5uwov1n7l" },
    include: {
      saleOrderItems: {
        include: {
          inventoryItem: { select: { imageUrl: true, code: true } }
        }
      },
    },
  });

  let orderItems = order.saleOrderItems;

  for (const item of orderItems) {
    if (!item.inventoryItem && item.tenHang) {
      const invItem = await prisma.inventoryItem.findFirst({
        where: { tenHang: item.tenHang },
        select: { imageUrl: true, code: true }
      });
      if (invItem) {
        item.inventoryItem = invItem;
      }
    }
  }

  const resolvedOrder = {
    ...order,
    items: orderItems,
  };

  console.log(JSON.stringify(resolvedOrder.items, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
