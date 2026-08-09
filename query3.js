const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const debt = await prisma.debt.findFirst({
     where: { referenceId: 'DH-20260809-0002' }
  });
  console.log("description:", debt ? debt.description : "Not found");
  console.log("paidAmount:", debt ? debt.paidAmount : "Not found");
}
main().catch(console.error).finally(() => prisma.$disconnect());
