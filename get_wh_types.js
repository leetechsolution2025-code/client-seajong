const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const warehouses = await prisma.warehouse.findMany();
  console.log(warehouses.map(w => `${w.code} - ${w.name} - ${w.type}`).join('\n'));
}
main().catch(console.error).finally(() => prisma.$disconnect());
