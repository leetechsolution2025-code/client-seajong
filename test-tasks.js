const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.task.findMany();
  console.log("Tasks count:", tasks.length);
}
main().finally(() => prisma.$disconnect());
