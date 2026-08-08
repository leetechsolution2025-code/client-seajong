const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const t = await prisma.logisticsTicket.findFirst({
    where: { code: 'PK-20260808-8385' },
    select: {
      id: true, code: true, status: true, type: true, createdAt: true,
      saleOrder: { 
        select: { 
          id: true, code: true,
          saleOrderItems: {
            select: {
              inventoryItemId: true,
              dinhMucId: true,
              ghiChu: true
            }
          }
        } 
      },
      items: {
        select: {
          requestedQty: true,
          pickedQty: true,
          inventoryItemId: true,
          inventoryItem: { select: { tenHang: true, donVi: true } }
        }
      }
    }
  });

  const resultItems = t.items.map(it => {
    let bomCode = null;
    if (t.saleOrder && t.saleOrder.saleOrderItems) {
      const soItem = t.saleOrder.saleOrderItems.find(soi => soi.inventoryItemId === it.inventoryItemId);
      if (soItem && soItem.ghiChu) {
        try {
          const parsed = JSON.parse(soItem.ghiChu);
          console.log("Parsed ghiChu:", parsed);
          if (parsed.bomCode) bomCode = parsed.bomCode;
        } catch(e) {}
      }
    }
    return {
      tenHang: it.inventoryItem.tenHang,
      bomCode
    };
  });
  console.log(resultItems);
}
run();
