const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.emailConfig.findMany();
  console.log("All configs:", configs);
}
main().finally(() => prisma.$disconnect());
