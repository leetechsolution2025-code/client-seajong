const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const debts = await prisma.debt.findMany({ where: { type: { in: ['PAYABLE', 'phai-tra'] } } });
  console.log(JSON.stringify(debts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
