const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.create({
    data: {
      name: 'Trụ sở chính',
      code: 'MAIN',
      address: 'Hà Nội',
      clientId: 'default'
    }
  });
  console.log('Created branch:', branch);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
