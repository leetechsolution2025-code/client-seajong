import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.task.findMany({
    where: {
      deptCode: "logistics",
      title: { contains: "Gom hàng" },
      status: "pending"
    }
  });
  console.log("Tasks:", tasks.length);
  if (tasks.length > 0) {
    console.log("Task 1:", tasks[0]);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
