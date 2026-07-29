const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const mats = await prisma.$queryRaw`SELECT id, "tenVatTu" FROM "MaterialItem" LIMIT 5;`.catch(e => e.message);
  console.log(mats);
}
main().finally(() => prisma.$disconnect());
