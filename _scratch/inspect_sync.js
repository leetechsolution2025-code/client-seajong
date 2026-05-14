const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const approvals = await prisma.approvalRequest.findMany({
    where: { entityType: 'marketing_monthly_execution' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('Approvals:', JSON.stringify(approvals, null, 2));

  const plans = await prisma.marketingMonthlyPlan.findMany({
    include: { tasks: true },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });

  console.log('Monthly Plans:', JSON.stringify(plans, null, 2));
}

main().catch(console.error);
