import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, code: true, name: true, type: true }
  });
  console.log("Warehouses:", warehouses);
}

main().catch(console.error).finally(() => prisma.$disconnect());
