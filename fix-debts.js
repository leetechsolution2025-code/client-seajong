const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const debts = await prisma.debt.findMany({ where: { type: { in: ['PAYABLE', 'phai-tra', 'RECEIVABLE', 'phai-thu'] } } });
  let count = 0;
  for (const debt of debts) {
    if ((debt.type === 'PAYABLE' || debt.type === 'phai-tra') && !debt.supplierId && debt.partnerName) {
       const baseName = debt.partnerName.split(/[-–]/)[0].trim();
       const supp = await prisma.supplier.findFirst({ where: { name: { startsWith: baseName } }});
       if (supp) {
          await prisma.debt.update({ where: { id: debt.id }, data: { supplierId: supp.id } });
          count++;
          console.log(`Updated supplierId for payable: ${debt.partnerName}`);
       }
    }
    if ((debt.type === 'RECEIVABLE' || debt.type === 'phai-thu') && !debt.customerId && debt.partnerName) {
       const baseName = debt.partnerName.split(/[-–]/)[0].trim();
       const cust = await prisma.customer.findFirst({ where: { name: { startsWith: baseName } }});
       if (cust) {
          await prisma.debt.update({ where: { id: debt.id }, data: { customerId: cust.id } });
          count++;
          console.log(`Updated customerId for receivable: ${debt.partnerName}`);
       }
    }
  }
  console.log(`Finished fixing ${count} debts.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
