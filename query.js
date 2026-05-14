const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const benefits = await prisma.insuranceBenefit.findMany({ include: { employee: true } });
  console.log(JSON.stringify(benefits, null, 2));
}
main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
