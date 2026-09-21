import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.inventoryStock.updateMany({
    data: {
      soLuongGiu: 0
    }
  });

  const activeOrders = await prisma.saleOrder.findMany({
    where: {
      trangThai: { notIn: ['completed', 'cancelled'] },
      logisticsTickets: { none: { status: 'COMPLETED' } }
    },
    include: { saleOrderItems: true }
  });

  for (const order of activeOrders) {
    for (const item of order.saleOrderItems) {
      if (!item.inventoryItemId) continue;
      
      let remaining = item.soLuong;
      const stocks = await prisma.inventoryStock.findMany({
        where: { inventoryItemId: item.inventoryItemId },
        orderBy: { soLuong: 'desc' }
      });
      
      for (const stock of stocks) {
        if (remaining <= 0) break;
        const available = stock.soLuong - stock.soLuongGiu;
        if (available > 0) {
          const toHold = Math.min(available, remaining);
          await prisma.inventoryStock.update({
            where: { id: stock.id },
            data: { soLuongGiu: { increment: toHold } }
          });
          remaining -= toHold;
        }
      }
      
      if (remaining > 0 && stocks.length > 0) {
        await prisma.inventoryStock.update({
          where: { id: stocks[0].id },
          data: { soLuongGiu: { increment: remaining } }
        });
      }
    }
  }

  // Also fix Quotation stocks (if they hold any without being won)
  const activeQuotes = await prisma.quotation.findMany({
    where: {
      trangThai: { notIn: ['lost', 'won'] }
    },
    include: { items: true }
  });

  for (const q of activeQuotes) {
    for (const item of q.items) {
      if (!item.tenHang) continue;
      const invItem = await prisma.inventoryItem.findFirst({
        where: { tenHang: item.tenHang }
      });
      if (!invItem) continue;

      let remaining = item.soLuong;
      const stocks = await prisma.inventoryStock.findMany({
        where: { inventoryItemId: invItem.id },
        orderBy: { soLuong: 'desc' }
      });
      
      for (const stock of stocks) {
        if (remaining <= 0) break;
        const available = stock.soLuong - stock.soLuongGiu;
        if (available > 0) {
          const toHold = Math.min(available, remaining);
          await prisma.inventoryStock.update({
            where: { id: stock.id },
            data: { soLuongGiu: { increment: toHold } }
          });
          remaining -= toHold;
        }
      }
      
      if (remaining > 0 && stocks.length > 0) {
        await prisma.inventoryStock.update({
          where: { id: stocks[0].id },
          data: { soLuongGiu: { increment: remaining } }
        });
      }
    }
  }

  console.log("All held stock reset to 0, then successfully recalculated from active orders and quotes!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
