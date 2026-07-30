import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    where: { description: { contains: "QC-20260730-482" } }
  });
  console.log(tasks);
}

main().catch(console.error).finally(() => prisma.$disconnect());
