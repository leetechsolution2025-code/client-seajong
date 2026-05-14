import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = {
    plans: await prisma.marketingYearlyPlan.count(),
    outlines: await prisma.outlineMarketingPlan.count(),
    general: await prisma.marketingGeneralPlan.count(),
    goals: await prisma.marketingYearlyGoal.count(),
    tasks: await prisma.marketingYearlyTask.count(),
    execution: await prisma.marketingExecutionMonth.count()
  };
  console.log("Counts:", JSON.stringify(counts, null, 2));

  const samplePlan = await prisma.marketingYearlyPlan.findFirst();
  console.log("Sample Plan:", JSON.stringify(samplePlan, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
