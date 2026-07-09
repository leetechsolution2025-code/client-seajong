const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const plan = await prisma.masterYearlyPlan.findUnique({
    where: { year: -2026 }
  });
  if (plan) {
    const data = JSON.parse(plan.planData);
    console.log("isCalculateByRevenue:", data.isCalculateByRevenue);
    console.log("costOperationsPercent:", data.costOperationsPercent);
    console.log("costOperations:", data.costOperations);
    console.log("costMarketingPercent:", data.costMarketingPercent);
    console.log("costMarketing:", data.costMarketing);
  } else {
    console.log("No plan found for -2026");
  }
}
run().finally(() => prisma.$disconnect());
