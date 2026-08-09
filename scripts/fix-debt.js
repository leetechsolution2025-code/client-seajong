const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.debt.update({
    where: { id: 'cmsluy5e30007go2a6mpsvlbm' },
    data: { customerId: 'cmslq63kc006r8o10lez49wk4' }
  });
  console.log("Updated existing debt to map to customer");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
