const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const wh = await prisma.warehouse.findUnique({ where: { code: 'KVP' }});
  console.log("KVP type:", wh.type);
}
main().catch(console.error).finally(() => prisma.$disconnect());
