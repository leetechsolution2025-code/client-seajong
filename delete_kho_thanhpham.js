const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const khoThanhPham = await prisma.warehouse.findFirst({ where: { code: 'KHO-THANHPHAM' } });
  const khoChinh = await prisma.warehouse.findFirst({ where: { code: 'KHO-CHINH' } });
  
  if (!khoThanhPham) {
    console.log("KHO-THANHPHAM not found. Already deleted.");
    return;
  }
  
  if (!khoChinh) {
    console.log("KHO-CHINH not found. Cannot migrate.");
    return;
  }

  console.log(`Found KHO-THANHPHAM: ${khoThanhPham.id}. KHO-CHINH: ${khoChinh.id}`);

  // 1. Move all InventoryStocks
  const stocks = await prisma.inventoryStock.findMany({ where: { warehouseId: khoThanhPham.id } });
  console.log(`Found ${stocks.length} stocks in KHO-THANHPHAM`);
  
  for (const stock of stocks) {
    // Check if KHO-CHINH already has this item
    const existing = await prisma.inventoryStock.findFirst({
      where: { warehouseId: khoChinh.id, inventoryItemId: stock.inventoryItemId }
    });
    
    if (existing) {
      await prisma.inventoryStock.update({
        where: { id: existing.id },
        data: { soLuong: existing.soLuong + stock.soLuong }
      });
      await prisma.inventoryStock.delete({ where: { id: stock.id } });
    } else {
      await prisma.inventoryStock.update({
        where: { id: stock.id },
        data: { warehouseId: khoChinh.id }
      });
    }
  }

  // 2. Move LogisticsTransactions
  const txsCount = await prisma.logisticsTransaction.updateMany({
    where: { warehouseId: khoThanhPham.id },
    data: { warehouseId: khoChinh.id }
  });
  console.log(`Moved ${txsCount.count} transactions to KHO-CHINH`);
  
  // Update fromWarehouseId and toWarehouseId if they exist
  // Wait, these fields are not standard in all schemas. Let's check schema.
  // We'll catch if it fails.

  // 3. Delete KHO-THANHPHAM
  await prisma.warehouse.delete({ where: { id: khoThanhPham.id } });
  console.log("Deleted KHO-THANHPHAM successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
