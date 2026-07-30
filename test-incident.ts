import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const incidents = await prisma.productionIncident.findMany({
    include: { saleOrder: true }
  });
  console.log(incidents);
}
main().finally(() => prisma.$disconnect());
