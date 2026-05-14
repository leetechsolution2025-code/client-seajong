import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.marketingYearlyPlan.findMany({});
  console.log("Plans found:", plans.length);
  plans.forEach(p => console.log(`ID: ${p.id}, Year: ${p.year}, Status: ${p.status}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
