const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const reqs = await prisma.approvalRequest.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(reqs, null, 2));
}
main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
