const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const materials = await prisma.$queryRaw`SELECT * FROM "MaterialItem" LIMIT 10`;
  console.log(materials.map(m => ({ name: m.name, catId: m.categoryId })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
