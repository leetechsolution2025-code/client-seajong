import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const rawPlans = await prisma.marketingYearlyPlan.findMany({
      include: {
        generalPlan: true,
        goals: true,
        budgetPlan: {
          include: {
            items: {
              include: { monthlyDetails: true }
            },
            monthlyTotals: true
          }
        },
        tasks: true,
        executionMonths: {
          include: {
            groups: {
              include: { tasks: true }
            }
          }
        }
      }
    });
    console.log("Plans found:", rawPlans.length);
    console.log(JSON.stringify(rawPlans, null, 2));
  } catch (err) {
    console.error("QUERY ERROR:", err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
