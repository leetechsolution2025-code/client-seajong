import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.saleOrder.deleteMany({
    where: { code: { startsWith: 'DEBUG-DEL-' } }
  });
  console.log("Deleted debug orders");
}
main().catch(console.error).finally(() => prisma.$disconnect());
