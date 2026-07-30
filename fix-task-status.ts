import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.task.updateMany({
    where: { 
      title: { contains: "Lệnh sản xuất cho đơn hàng DBH-20260730-01" },
      status: { not: "completed" }
    },
    data: {
      status: "completed",
      completedAt: new Date()
    }
  });
  console.log("Updated task DBH-20260730-01 status to completed");
}
main();
