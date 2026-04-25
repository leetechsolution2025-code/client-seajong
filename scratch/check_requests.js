const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const requests = await prisma.approvalRequest.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(requests, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
