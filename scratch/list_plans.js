
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.marketingYearlyPlan.findMany({
    select: { id: true, year: true, status: true }
  });
  console.log(JSON.stringify(plans, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
