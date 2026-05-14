const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plan = await prisma.marketingYearlyPlan.findFirst({
    where: { status: 'ban-hanh' },
    include: { tasks: true }
  });

  if (!plan) {
    console.log('No active plan found');
    return;
  }

  console.log('Yearly Plan Tasks:');
  plan.tasks.forEach(t => {
    console.log(`- ${t.name} | Assignee: ${t.assigneeId}`);
  });
}

main().catch(console.error);
