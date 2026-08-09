const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ws = await prisma.warehouse.findMany({ select: { id: true, code: true, name: true } });
  console.log(JSON.stringify(ws, null, 2));
}
main().finally(() => prisma.$disconnect());
