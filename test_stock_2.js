const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const khoChinh = await prisma.warehouse.findUnique({ where: { code: 'KHO-CHINH' } });
  if (!khoChinh) { console.log("NO KHO CHINH"); return; }
  const stocks = await prisma.inventoryStock.findMany({
    where: { warehouseId: khoChinh.id }
  });
  console.log("Stocks in KHO-CHINH:", stocks.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
