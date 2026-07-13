const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const khoThanhPham = await prisma.warehouse.findUnique({ where: { code: 'KHO-THANHPHAM' } });
  if (!khoThanhPham) { console.log("NO KHO THANH PHAM"); return; }
  const stocks = await prisma.inventoryStock.findMany({
    where: { warehouseId: khoThanhPham.id }
  });
  console.log("Stocks in KHO-THANHPHAM:", stocks.length);
  if (stocks.length > 0) {
    console.log("Sample:", stocks[0]);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
