const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.task.findMany({
    where: { title: { contains: 'Gom hàng' } }
  });
  console.log(tasks.map(t => t.actualResult));
}
main().finally(() => prisma.$disconnect());
