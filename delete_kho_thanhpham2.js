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

  // 1. Move all StockCount
  await prisma.stockCount.updateMany({
    where: { warehouseId: khoThanhPham.id },
    data: { warehouseId: khoChinh.id }
  });

  // 2. Move StockMovement
  await prisma.stockMovement.updateMany({
    where: { fromWarehouseId: khoThanhPham.id },
    data: { fromWarehouseId: khoChinh.id }
  });
  
  await prisma.stockMovement.updateMany({
    where: { toWarehouseId: khoThanhPham.id },
    data: { toWarehouseId: khoChinh.id }
  });

  // 3. Delete KHO-THANHPHAM
  await prisma.warehouse.delete({ where: { id: khoThanhPham.id } });
  console.log("Deleted KHO-THANHPHAM successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
