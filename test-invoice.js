const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.retailInvoiceItem.findMany({
    include: { inventoryItem: true, invoice: true }
  });
  console.log("RetailInvoiceItem count:", items.length);
  
  const invoices = await prisma.retailInvoice.findMany({});
  console.log("RetailInvoice count:", invoices.length);
}
main().finally(() => prisma.$disconnect());
