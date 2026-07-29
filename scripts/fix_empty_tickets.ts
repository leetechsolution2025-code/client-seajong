import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emptyTickets = await prisma.logisticsTicket.findMany({
    where: { status: 'PENDING' },
    include: { items: true, saleOrder: { include: { saleOrderItems: true } } }
  });

  for (const ticket of emptyTickets) {
    if (ticket.items.length === 0 && ticket.saleOrder) {
      console.log(`Fixing ticket ${ticket.code} for order ${ticket.saleOrder.code}`);
      
      for (const item of ticket.saleOrder.saleOrderItems) {
        let invItemId = item.inventoryItemId;
        
        if (!invItemId) {
          const matched = await prisma.inventoryItem.findFirst({
            where: { OR: [{ code: item.tenHang }, { tenHang: item.tenHang }] }
          });
          if (matched) {
            invItemId = matched.id;
            await prisma.saleOrderItem.update({ where: { id: item.id }, data: { inventoryItemId: invItemId } });
          }
        }
        
        if (invItemId) {
          // Add to ticket
          await prisma.logisticsTicketItem.create({
            data: {
              ticketId: ticket.id,
              inventoryItemId: invItemId,
              requestedQty: item.soLuong,
            }
          });
          console.log(` - Added item ${item.tenHang} to ticket ${ticket.code}`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
