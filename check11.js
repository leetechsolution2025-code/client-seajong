const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.inventoryCategory.findMany({ where: { code: 'VT_TP_CHINH' } });
  console.log("VT_TP_CHINH:", c);
}
main();
