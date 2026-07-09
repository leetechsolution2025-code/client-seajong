const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const oemPlan = await prisma.oemMasterYearlyPlan.findFirst({
    where: { year: 2026 }
  })
  if (oemPlan) {
    console.log("Found OEM Plan Data length: ", oemPlan.planData.length);
  } else {
    console.log("No OEM Plan found for 2026");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
