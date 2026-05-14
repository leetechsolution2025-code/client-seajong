const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const changes = await prisma.insuranceChange.findMany({
    include: { employee: { select: { fullName: true, code: true, status: true } } }
  });
  console.log(JSON.stringify(changes, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
