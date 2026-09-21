import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const stock = await prisma.inventoryStock.findUnique({
    where: { id: 'cmslf1zll0003ygngfmjbc3t8' }
  });
  console.log("Current stock:", stock);
}
main().catch(console.error).finally(() => prisma.$disconnect());
