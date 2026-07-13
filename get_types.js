const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const whs = await prisma.warehouse.findMany();
  console.log("Warehouses:", whs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
