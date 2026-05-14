const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.marketingTask.findMany({
    where: {
      taskType: "group"
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log(JSON.stringify(tasks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
