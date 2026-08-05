import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const reports = await prisma.internalKpiReport.findMany();
  console.log(reports);
}
main().catch(console.error).finally(() => prisma.$disconnect());
