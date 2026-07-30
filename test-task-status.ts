import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.task.findMany({
    where: { title: { contains: "Lệnh sản xuất cho đơn hàng DBH-20260730-01" } }
  });
  console.log(tasks);
}
main();
