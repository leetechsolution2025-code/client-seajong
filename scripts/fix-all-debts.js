const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { name: { startsWith: 'Đại lý Hồng Liên' } }
  });

  if (customer) {
    const result = await prisma.debt.updateMany({
      where: {
        partnerName: { startsWith: 'Đại lý Hồng Liên' },
        customerId: null
      },
      data: { customerId: customer.id }
    });
    console.log(`Updated ${result.count} debts with missing customerId.`);
  } else {
    console.log("Customer not found.");
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
