import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const itemCode = 'CSC01S';
  const item = await prisma.inventoryItem.findFirst({
    where: { code: itemCode }
  });
  
  if (!item) return;

  const order = await prisma.saleOrder.create({
    data: {
      code: 'DEBUG-DEL-API',
      trangThai: 'draft',
      saleOrderItems: {
        create: [{
          inventoryItemId: item.id,
          tenHang: item.tenHang,
          soLuong: 10,
          donGia: 1000,
          thanhTien: 10000
        }]
      }
    }
  });

  const stock = await prisma.inventoryStock.findFirst({
    where: { inventoryItemId: item.id }
  });
  
  if (!stock) return;

  await prisma.inventoryStock.update({
    where: { id: stock.id },
    data: { soLuongGiu: { increment: 10 } }
  });

  console.log(`Created order ${order.id} holding 10 of ${item.id}`);

  try {
    await prisma.$transaction(async (tx) => {
      const orderToDel = await tx.saleOrder.findUnique({
        where: { id: order.id },
        include: { saleOrderItems: true }
      });

      const ticketsToDelete = await tx.logisticsTicket.findMany({
        where: { saleOrderId: order.id },
        select: { id: true, status: true }
      });
      const hasCompletedLogistics = ticketsToDelete.some(t => t.status === "COMPLETED");

      if (!hasCompletedLogistics && orderToDel?.saleOrderItems) {
        for (const it of orderToDel.saleOrderItems) {
          if (!it.inventoryItemId) continue;
          let qtyToRelease = it.soLuong;

          const stocks = await tx.inventoryStock.findMany({
            where: { inventoryItemId: it.inventoryItemId, soLuongGiu: { gt: 0 } },
            orderBy: { soLuongGiu: 'desc' }
          });

          for (const s of stocks) {
            if (qtyToRelease <= 0) break;
            const toRelease = Math.min(s.soLuongGiu, qtyToRelease);
            await tx.inventoryStock.update({
              where: { id: s.id },
              data: { soLuongGiu: { decrement: toRelease } }
            });
            qtyToRelease -= toRelease;
          }
        }
      }

      await tx.saleOrder.delete({ where: { id: order.id } });
    });
    console.log("Transaction succeeded!");
  } catch (e) {
    console.error("Transaction failed:", e);
  }

  const stockAfter = await prisma.inventoryStock.findUnique({ where: { id: stock.id }});
  console.log("Stock after delete:", stockAfter?.soLuongGiu);

}
main().catch(console.error).finally(() => prisma.$disconnect());
