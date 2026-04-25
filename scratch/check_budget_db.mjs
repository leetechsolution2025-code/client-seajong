import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.marketingBudgetPlan.findMany({
    include: {
      items: {
        include: { monthlyDetails: true }
      },
      monthlyTotals: true
    }
  });
  console.log(JSON.stringify(plans, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
