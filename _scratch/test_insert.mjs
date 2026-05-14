import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const planId = "cmnx3d13g005egpntobceag9w"; // From our previous check
  const budget = await prisma.marketingBudgetPlan.upsert({
    where: { planId },
    update: { revenueGoal: 5000000000 },
    create: { planId, revenueGoal: 5000000000 }
  });
  console.log("Budget created:", budget);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
