const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting debt backfill...');
  const debts = await prisma.debt.findMany();
  let updatedCount = 0;
  
  for (const debt of debts) {
    if (debt.customerId || debt.supplierId) continue;
    
    // We only care about RECEIVABLE and PAYABLE for now
    let baseName = debt.partnerName.split(/[-–]/)[0].trim();
    
    if (debt.type === 'RECEIVABLE' || debt.type === 'phai-thu') {
      const customer = await prisma.customer.findFirst({
        where: { name: { startsWith: baseName } }
      });
      
      if (customer) {
        await prisma.debt.update({
          where: { id: debt.id },
          data: { customerId: customer.id }
        });
        console.log(`Matched Debt ${debt.partnerName} to Customer ${customer.name}`);
        updatedCount++;
      } else {
        console.log(`NO MATCH FOR RECEIVABLE: ${debt.partnerName}`);
      }
    } else if (debt.type === 'PAYABLE' || debt.type === 'phai-tra') {
      const supplier = await prisma.supplier.findFirst({
        where: { name: { startsWith: baseName } }
      });
      
      if (supplier) {
        await prisma.debt.update({
          where: { id: debt.id },
          data: { supplierId: supplier.id }
        });
        console.log(`Matched Debt ${debt.partnerName} to Supplier ${supplier.name}`);
        updatedCount++;
      } else {
        console.log(`NO MATCH FOR PAYABLE: ${debt.partnerName}`);
      }
    }
  }
  
  console.log(`Backfill complete. Updated ${updatedCount} debts.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
