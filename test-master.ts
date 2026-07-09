import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const plan = await prisma.masterYearlyPlan.findFirst({ where: { year: 2026 }});
  console.log(plan?.planData);
}
main();
