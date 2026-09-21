import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const itemCode = 'CSC01S';
  const invItem = await prisma.inventoryItem.findFirst({
    where: { code: itemCode },
    include: { stocks: true }
  });
  
  if (!invItem) return;

  const q = await prisma.quotation.create({
    data: {
      code: 'DEBUG-Q',
      trangThai: 'draft',
      items: {
        create: [{
          tenHang: invItem.tenHang,
          soLuong: 50,
          donGia: 1000,
          thanhTien: 50000
        }]
      }
    }
  });

  const stock = await prisma.inventoryStock.findFirst({
    where: { inventoryItemId: invItem.id }
  });
  
  if (!stock) return;

  await prisma.inventoryStock.update({
    where: { id: stock.id },
    data: { soLuongGiu: { increment: 50 } }
  });

  console.log(`Created quotation ${q.id} holding 50 of ${invItem.id}`);

  // Simulating DELETE API
  try {
    await prisma.$transaction(async (tx) => {
      const quotationWithItems = await tx.quotation.findUnique({
        where: { id: q.id },
        include: { items: true }
      });

      if (quotationWithItems?.items) {
        for (const item of quotationWithItems.items) {
          if (!item.tenHang) continue;

          const foundInvItem = await tx.inventoryItem.findFirst({
            where: { tenHang: item.tenHang }
          });
          if (!foundInvItem) {
             console.log("Could not find invItem for", item.tenHang);
             continue;
          }

          let qtyToRelease = item.soLuong;

          const stocks = await tx.inventoryStock.findMany({
            where: { inventoryItemId: foundInvItem.id, soLuongGiu: { gt: 0 } },
            orderBy: { soLuongGiu: 'desc' }
          });
          
          console.log(`Found ${stocks.length} stocks for ${foundInvItem.id}`);

          for (const s of stocks) {
            if (qtyToRelease <= 0) break;
            const toRelease = Math.min(s.soLuongGiu, qtyToRelease);
            console.log(`Releasing ${toRelease} from stock ${s.id}`);
            await tx.inventoryStock.update({
              where: { id: s.id },
              data: { soLuongGiu: { decrement: toRelease } }
            });
            qtyToRelease -= toRelease;
          }
        }
      }

      await tx.quotationItem.deleteMany({ where: { quotationId: q.id } });
      await tx.quotation.delete({ where: { id: q.id } });
    });
    console.log("Transaction succeeded!");
  } catch (e) {
    console.error("Transaction failed:", e);
  }

  const stockAfter = await prisma.inventoryStock.findUnique({ where: { id: stock.id }});
  console.log("Stock after delete:", stockAfter?.soLuongGiu);

}
main().catch(console.error).finally(() => prisma.$disconnect());
