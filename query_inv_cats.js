const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.inventoryCategory.findMany({ where: { name: { contains: 'Sen' } }});
  console.log("Inventory Categories:", cats.map(c => ({id: c.id, name: c.name})));
}
main().catch(console.error).finally(() => prisma.$disconnect());
