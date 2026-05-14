const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.insuranceBenefit.deleteMany({});
  await prisma.insuranceHistory.deleteMany({});
  console.log("Deleted mock data");
}
main().catch(console.error).finally(() => prisma.$disconnect());
