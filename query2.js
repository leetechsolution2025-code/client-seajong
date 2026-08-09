const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const debt = await prisma.debt.findFirst({
     where: { description: { contains: 'PT-20260809-420' } }
  });
  console.log(debt ? debt.description : "Not found");
}
main().catch(console.error).finally(() => prisma.$disconnect());
