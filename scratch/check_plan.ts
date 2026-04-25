import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plan = await prisma.marketingYearlyPlan.findFirst({
    where: { year: 2026 },
    include: {
        generalPlan: true,
        goals: true,
    }
  });
  console.log(JSON.stringify(plan, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
