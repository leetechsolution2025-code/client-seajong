const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const debts = await prisma.debt.findMany();
  console.log('All Debts:', debts);
  const notification = await prisma.paymentNotification.findUnique({where: {id: 'cmsebtwlk000i8o1ytcvdha1p'}});
  console.log('Notification:', notification);
}
main().finally(() => prisma.$disconnect());
