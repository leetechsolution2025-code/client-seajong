const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invs = await prisma.retailInvoice.findMany({});
  console.log("Retail invoices:", invs.length);
}
main().finally(() => prisma.$disconnect());
