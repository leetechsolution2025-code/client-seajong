import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const plans = await prisma.marketingMonthlyPlan.findMany({ include: { tasks: true } });
  console.log(JSON.stringify(plans, null, 2));
}
main();
