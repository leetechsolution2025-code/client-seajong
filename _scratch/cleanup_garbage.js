const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanUp() {
  console.log('Cleaning up garbage data...');
  
  const deletedTasks = await prisma.marketingTask.deleteMany({
    where: {
      title: { contains: 'Bồn cầu Seajong' }
    }
  });
  console.log(`Deleted ${deletedTasks.count} tasks containing 'Bồn cầu Seajong'`);

  // Optionally, clean up all monthly plans if they want a fresh start
  const deletedPlans = await prisma.marketingMonthlyPlan.deleteMany({});
  console.log(`Deleted ${deletedPlans.count} monthly plans`);

  // Delete all approval requests for monthly execution to fully reset the test state
  const deletedApprovals = await prisma.approvalRequest.deleteMany({
    where: { entityType: 'marketing_monthly_execution' }
  });
  console.log(`Deleted ${deletedApprovals.count} approval requests`);

  console.log('Cleanup complete!');
}

cleanUp()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
