import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const stocks = await prisma.inventoryStock.findMany({
    where: { soLuongGiu: { gt: 0 } },
    include: { inventoryItem: true }
  });

  console.log(`Found ${stocks.length} stocks with soLuongGiu > 0`);
  let totalFixed = 0;

  for (const stock of stocks) {
    if (!stock.inventoryItem) continue;

    const sois = await prisma.saleOrderItem.findMany({
      where: { inventoryItemId: stock.inventoryItem.id },
      include: { saleOrder: true }
    });
    
    let expectedGiuSO = 0;
    for (const soi of sois) {
      if (soi.saleOrder && soi.saleOrder.trangThai !== 'cancelled') {
        const tickets = await prisma.logisticsTicket.findMany({
          where: { saleOrderId: soi.saleOrder.id }
        });
        const hasCompleted = tickets.some((t: any) => t.status === 'COMPLETED');
        if (!hasCompleted) {
          expectedGiuSO += soi.soLuong;
        }
      }
    }

    const qis = await prisma.quotationItem.findMany({
      where: { tenHang: stock.inventoryItem.tenHang },
      include: { quotation: true }
    });
    let expectedGiuQ = 0;
    for (const qi of qis) {
      if (qi.quotation && qi.quotation.trangThai !== 'cancelled' && qi.quotation.trangThai !== 'Đã huỷ') {
        expectedGiuQ += qi.soLuong;
      }
    }

    const expectedTotal = expectedGiuSO + expectedGiuQ;
    
    if (stock.soLuongGiu !== expectedTotal) {
      console.log(`Fixing Item: ${stock.inventoryItem.code}. Current soLuongGiu: ${stock.soLuongGiu}. Expected: ${expectedTotal} (SO: ${expectedGiuSO}, Q: ${expectedGiuQ})`);
      await prisma.inventoryStock.update({
        where: { id: stock.id },
        data: { soLuongGiu: expectedTotal }
      });
      totalFixed++;
    }
  }
  console.log(`Fixed ${totalFixed} corrupted inventory records.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
