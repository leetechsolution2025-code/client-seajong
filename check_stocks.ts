import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const stocks = await prisma.inventoryStock.findMany({
    where: { warehouseId: 'cmq0s26fg0000goaespwzfn2w' }
  });
  console.log("Stocks in KHO-THANHPHAM:", stocks.length);
}
main().finally(() => prisma.$disconnect());
