const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.marketingYearlyTask.findMany({
    where: { parentId: null }
  });
  console.log(JSON.stringify(tasks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
