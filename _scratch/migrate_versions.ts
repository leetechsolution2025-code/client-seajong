import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.marketingYearlyPlan.findMany();
  for (const plan of plans) {
    await prisma.marketingYearlyPlan.update({
      where: { id: plan.id },
      data: {
        isCurrent: true,
        versionStatus: "ACTIVE"
      }
    });
    console.log(`Updated plan ${plan.code} to ACTIVE/isCurrent`);
  }

  const outlines = await prisma.outlineMarketingPlan.findMany();
  for (const outline of outlines) {
    const plan = await prisma.marketingYearlyPlan.findFirst({
      where: { year: outline.year, isCurrent: true }
    });
    if (plan) {
      await prisma.outlineMarketingPlan.update({
        where: { id: outline.id },
        data: { planId: plan.id }
      });
      console.log(`Linked outline for year ${outline.year} to plan ${plan.id}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
