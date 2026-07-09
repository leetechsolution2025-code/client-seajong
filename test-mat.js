const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stocks = await prisma.materialStock.findMany({ include: { material: true } });
  let materialValue = 0;
  stocks.forEach(stock => {
    const cost = stock.material?.price || (stock.material?.giaBan || 0) * 0.4 || 0;
    const stockValue = (stock.soLuong || 0) * cost;
    materialValue += stockValue;
  });
  console.log("materialValue:", materialValue);
}
main().finally(() => prisma.$disconnect());
