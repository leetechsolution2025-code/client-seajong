import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const plans = await prisma.marketingYearlyPlan.findMany({ include: { goals: true, tasks: true } })
  console.log(JSON.stringify(plans, null, 2))
}
main()
