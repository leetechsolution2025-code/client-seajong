const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.seajongProduct.count();
  console.log(count);
}
main().finally(() => prisma.$disconnect());
