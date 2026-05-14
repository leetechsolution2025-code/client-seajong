const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.marketingMonthlyPlan.findMany({
    where: { year: 2026, month: 4 },
    include: { tasks: true }
  });
  console.log(JSON.stringify(plans, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
