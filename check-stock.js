const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const thanhPhamWh = await prisma.warehouse.findFirst({ where: { code: 'KHO-THANHPHAM' } });
  const hangHoaWh = await prisma.warehouse.findFirst({ where: { code: 'KHO-CHINH' } });
  
  if (thanhPhamWh) {
    const countTP = await prisma.inventoryStock.count({ where: { warehouseId: thanhPhamWh.id } });
    console.log(`Kho thành phẩm (${thanhPhamWh.id}): ${countTP} sản phẩm`);
  }
  if (hangHoaWh) {
    const countHH = await prisma.inventoryStock.count({ where: { warehouseId: hangHoaWh.id } });
    console.log(`Kho hàng hoá (${hangHoaWh.id}): ${countHH} sản phẩm`);
  }
}
main().finally(() => prisma.$disconnect());
