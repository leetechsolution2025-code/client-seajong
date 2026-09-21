import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { code: 'CSC01S' },
    include: { stocks: true }
  });
  
  if (!item) { console.log("Item not found"); return; }
  const stock = item.stocks[0];
  
  console.log(`Before: soLuongGiu = ${stock.soLuongGiu}`);
  
  // Create a fake SaleOrder
  const order = await prisma.saleOrder.create({
    data: {
      code: 'TEST-DEL-1',
      trangThai: 'draft',
      saleOrderItems: {
        create: [
          {
            inventoryItemId: item.id,
            tenHang: item.tenHang,
            soLuong: 5,
            donGia: 1000,
            thanhTien: 5000
          }
        ]
      }
    }
  });
  
  // Manually increment soLuongGiu to simulate order creation
  await prisma.inventoryStock.update({
    where: { id: stock.id },
    data: { soLuongGiu: { increment: 5 } }
  });
  
  console.log(`Created order ${order.id}. soLuongGiu incremented by 5`);
  
  const stockAfterCreate = await prisma.inventoryStock.findUnique({ where: { id: stock.id } });
  console.log(`After create: soLuongGiu = ${stockAfterCreate?.soLuongGiu}`);
  
  // Call the DELETE API logic manually to see what happens
  const id = order.id;
  const orderToDelete = await prisma.saleOrder.findUnique({
    where: { id },
    include: { saleOrderItems: true }
  });
  
  if (!orderToDelete) return;
  
  await prisma.$transaction(async (tx) => {
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
  
  const stockAfterDelete = await prisma.inventoryStock.findUnique({ where: { id: stock.id } });
  console.log(`After delete: soLuongGiu = ${stockAfterDelete?.soLuongGiu}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
