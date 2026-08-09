const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const debts = await prisma.debt.findMany({
    where: {
      partnerName: {
        contains: 'Hồng Liên'
      }
    },
    select: {
      id: true,
      partnerName: true,
      referenceId: true,
      customerId: true,
      amount: true
    }
  });
  console.log("DEBTS:", debts);

  const customers = await prisma.customer.findMany({
    where: {
      name: {
        contains: 'Hồng Liên'
      }
    }
  });
  console.log("CUSTOMERS:", customers);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
