const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const req = await prisma.approvalRequest.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(req, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
