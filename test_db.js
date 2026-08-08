const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const debts = await prisma.debt.findMany();
  console.log(debts.map(d => ({ id: d.id, referenceId: d.referenceId })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
