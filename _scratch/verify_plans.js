const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.marketingMonthlyPlan.findMany({
    where: { year: 2026, month: 4 },
    select: { id: true, employeeId: true, employeeName: true, status: true }
  });
  console.log(plans);
}

main().catch(console.error).finally(() => prisma.$disconnect());
