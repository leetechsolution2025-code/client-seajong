import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const itemCode = 'TSC03S';
  const item = await prisma.inventoryItem.findFirst({
    where: { code: itemCode },
    include: { stocks: true }
  });
  
  if (!item) {
    console.log("Item not found");
    return;
  }
  
  // Create a dummy sale order holding 10 items
  const order = await prisma.saleOrder.create({
    data: {
      code: 'DEBUG-DEL-2',
      trangThai: 'draft',
      saleOrderItems: {
        create: [
          {
            inventoryItemId: item.id,
            tenHang: item.tenHang,
            soLuong: 10,
            donGia: 1000,
            thanhTien: 10000
          }
        ]
      }
    }
  });
  
  // Manually increment stock to simulate hold
  const stock = item.stocks[0];
  await prisma.inventoryStock.update({
    where: { id: stock.id },
    data: { soLuongGiu: { increment: 10 } }
  });
  
  const id = order.id;
  const orderToDelete = await prisma.saleOrder.findUnique({
    where: { id },
    include: { saleOrderItems: true }
  });
  
  if (!orderToDelete) return;
  
  await prisma.$transaction(async (tx) => {
    // Logic from the DELETE route
    const ticketsToDelete = await tx.logisticsTicket.findMany({
      where: { saleOrderId: id },
      select: { id: true, status: true }
    });
    const ticketIdsToDelete = ticketsToDelete.map(t => t.id);

    const hasCompletedLogistics = ticketsToDelete.some(t => t.status === "COMPLETED");
    console.log("hasCompletedLogistics:", hasCompletedLogistics);

    if (!hasCompletedLogistics && orderToDelete.saleOrderItems) {
      console.log("Found saleOrderItems:", orderToDelete.saleOrderItems.length);
      for (const item of orderToDelete.saleOrderItems) {
        if (!item.inventoryItemId) continue;
        let qtyToRelease = item.soLuong;
        console.log("Releasing qty:", qtyToRelease, "for item", item.inventoryItemId);

        const stocks = await tx.inventoryStock.findMany({
          where: { inventoryItemId: item.inventoryItemId, soLuongGiu: { gt: 0 } },
          orderBy: { soLuongGiu: 'desc' }
        });

        for (const stock of stocks) {
          if (qtyToRelease <= 0) break;
          const toRelease = Math.min(stock.soLuongGiu, qtyToRelease);
          console.log(`Decremeting stock ${stock.id} by ${toRelease}`);
          await tx.inventoryStock.update({
            where: { id: stock.id },
            data: { soLuongGiu: { decrement: toRelease } }
          });
          qtyToRelease -= toRelease;
        }
      }
    }
    
    await tx.saleOrder.delete({ where: { id } });
  });
  
  const stockAfterAPI = await prisma.inventoryStock.findUnique({ where: { id: stock.id } });
  console.log(`soLuongGiu after simulated delete: ${stockAfterAPI?.soLuongGiu}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
