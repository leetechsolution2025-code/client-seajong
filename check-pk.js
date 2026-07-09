const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const allWh = await prisma.warehouse.findMany();
  console.log(allWh.map(w => ({ code: w.code, count: w.id })));
  
  for(let w of allWh) {
    const c = await prisma.inventoryStock.count({ where: { warehouseId: w.id } });
    console.log(`${w.code}: ${c}`);
  }
}
main().finally(() => prisma.$disconnect());
