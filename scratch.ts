import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const tickets = await (prisma as any).logisticsTicket.findMany({
    where: { type: "BATCH_PACKING", status: { in: ["PENDING", "PICKING", "PACKED"] } },
    include: {
      saleOrder: { select: { code: true, ngayGiao: true } },
      items: { include: { inventoryItem: { include: { stocks: true } } } }
    }
  });

  const batchMap = new Map<string, any>();
  for (const ticket of tickets) {
    let items = ticket.items || [];
    for (const item of items) {
        const rawKey = item.inventoryItemId || item.id;
        if (!rawKey) continue;
        const ngayGiaoStr = ticket.saleOrder?.ngayGiao ? new Date(ticket.saleOrder.ngayGiao).toISOString() : "Không hẹn ngày";
        const key = `${ngayGiaoStr}_${rawKey}`;

        let thucTon = 0;
        if (item.inventoryItem?.stocks && item.inventoryItem.stocks.length > 0) {
          thucTon = item.inventoryItem.stocks.reduce((acc: number, cur: any) => acc + (cur.soLuong || 0), 0);
        }

        if (!batchMap.has(key)) {
          batchMap.set(key, {
            tenHang: item.inventoryItem?.tenHang,
            tongSoLuong: 0,
            thucTon: thucTon
          });
        }
        batchMap.get(key).tongSoLuong += (item.requestedQty || 0);
    }
  }
  
  console.log(Array.from(batchMap.values()));
}
main()
