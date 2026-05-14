const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany();
  console.log('Current Branches in DB:', branches.map(b => ({ id: b.id, code: b.code, name: b.name })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
