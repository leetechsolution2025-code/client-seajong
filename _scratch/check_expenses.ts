import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.expense.count();
  const samples = await prisma.expense.findMany({ take: 5 });
  console.log('Total Expenses:', count);
  console.log('Sample Expenses:', JSON.stringify(samples, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
