import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.retailInvoice.findUnique({ 
    where: { code: "DHBL-20260714-01" },
    include: { items: true }
  });
  console.log(JSON.stringify(order, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
