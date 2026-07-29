const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find a few approved sale orders
  const orders = await prisma.saleOrder.findMany({
    where: { keToanDuyet: "approved" },
    include: { saleOrderItems: true },
    take: 5
  });

  if (orders.length === 0) {
    console.log("No approved sale orders found.");
    return;
  }

  for (const order of orders) {
    // Check if ticket already exists
    const existing = await prisma.logisticsTicket.findFirst({
      where: { saleOrderId: order.id }
    });
    if (existing) continue;

    console.log("Creating ticket for order", order.code);
    const bCode = "PK-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + Math.floor(1000 + Math.random() * 9000);
    
    const items = order.saleOrderItems.filter(i => i.inventoryItemId).map(i => ({
      inventoryItemId: i.inventoryItemId,
      requestedQty: i.soLuong
    }));

    if (items.length > 0) {
      await prisma.logisticsTicket.create({
        data: {
          code: bCode,
          type: "BATCH_PACKING",
          saleOrderId: order.id,
          status: "PENDING",
          items: {
            create: items
          }
        }
      });
      console.log("Created", bCode);
    }
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
