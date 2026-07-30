import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    where: { title: { contains: "Yêu cầu kiểm soát chất lượng" } }
  });
  console.log(tasks);
}

main().catch(console.error).finally(() => prisma.$disconnect());
