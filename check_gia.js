const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const mat = await prisma.materialItem.findFirst({ where: { code: "TS10" } });
  console.log("MaterialItem:", JSON.stringify(mat, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
