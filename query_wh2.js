const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const warehouses = await prisma.warehouse.findMany();
  console.log("=== WAREHOUSES ===");
  console.log(warehouses.map(w => `${w.code} - ${w.name}`).join('\n'));
  
  console.log("\n=== STOCK DATA ===");
  for (const wh of warehouses) {
    const stockCount = await prisma.inventoryStock.count({
      where: { warehouseId: wh.id, soLuong: { gt: 0 } }
    });
    console.log(`${wh.code} (${wh.name}): ${stockCount} items with qty > 0`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
