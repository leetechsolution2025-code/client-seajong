import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const warehouses = await prisma.warehouse.findMany({
    where: {
      code: { in: ['KHO-CHINH', 'KVP'] }
    }
  });
  console.log(JSON.stringify(warehouses, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
