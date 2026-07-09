const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const mats = await prisma.materialItem.findMany();
  console.log(mats.map(m => m.name).join(", "));
}
main().finally(() => prisma.$disconnect());
