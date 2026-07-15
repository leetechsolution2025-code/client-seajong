const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const mats = await prisma.materialItem.findMany({ where: { giaBan: { gt: 0 } } });
  console.log("Materials with giaBan > 0:", JSON.stringify(mats, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
