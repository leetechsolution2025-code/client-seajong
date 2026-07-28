const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const id = 'cms39nr6a0001grsjru8yfhnu';
  const order = await prisma.saleOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, dienThoai: true, address: true } },
        saleOrderItems: {
          include: {
            inventoryItem: { select: { imageUrl: true, code: true, loai: true, webProductId: true } }
          }
        },
      },
    });
  
  if (!order) return console.log("Not found");
  
  let orderItems = [];
    if (order.saleOrderItems && order.saleOrderItems.length > 0) {
      orderItems = order.saleOrderItems;
    }
    
    for (const item of orderItems) {
      if (!item.inventoryItem && item.tenHang) {
        const invItem = await prisma.inventoryItem.findFirst({
          where: { tenHang: item.tenHang },
          select: { id: true, imageUrl: true, code: true, soLuong: true, dinhMucs: { take: 1, select: { id: true } }, loai: true, webProductId: true }
        });
        if (invItem) {
          item.inventoryItem = invItem;
        } else {
          const matItem = await prisma.inventoryItem.findFirst({
            where: { tenHang: item.tenHang },
            select: { 
              imageUrl: true, 
              code: true, 
              stocks: { select: { soLuong: true } }
            }
          });
          if (matItem) {
            const soLuong = matItem.stocks ? matItem.stocks.reduce((acc, curr) => acc + (curr.soLuong || 0), 0) : 0;
            item.inventoryItem = { ...matItem, soLuong };
          }
        }
      }
    }
    
    for (const item of orderItems) {
      const requiredQty = item.soLuong || 1;
      const currentStock = item.inventoryItem?.soLuong || 0;
      const missingQty = Math.max(0, requiredQty - currentStock);
      item.missingQty = missingQty;
      item.canProduce = false;
      let resolvedDinhMucId = item.inventoryItem?.dinhMucId || null;
      let warehouseCode = "KHO-CHINH";
      if (!resolvedDinhMucId && item.inventoryItem) {
        const dm = await prisma.dinhMuc.findFirst({
          where: { inventoryItems: { some: { id: item.inventoryItem.id } } }
        });
        if (dm) resolvedDinhMucId = dm.id;
      }
      item.warehouseCode = warehouseCode;
      item.isManufactured = !!resolvedDinhMucId;
    }

    const customerName = order.customer?.name;
    let tongNoCu = 0;
    if (customerName && customerName !== "Khách vãng lai") {
      const debts = await prisma.debt.findMany({
        where: {
          type: { in: ["phai-thu", "RECEIVABLE"] },
          partnerName: customerName,
        },
        select: { amount: true, paidAmount: true }
      });
      tongNoCu = debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    }
    console.log("Success");
}
main().catch(e => console.error("ERR:", e)).finally(() => prisma.$disconnect());
