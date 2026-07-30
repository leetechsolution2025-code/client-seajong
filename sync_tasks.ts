import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const qcTasks = await prisma.task.findMany({
    where: {
      title: { contains: "Yêu cầu kiểm soát chất lượng" },
      status: { in: ["pending", "in_progress", "todo"] }
    }
  });

  console.log(`Found ${qcTasks.length} pending QC tasks.`);

  for (const task of qcTasks) {
    // extract QC code from description: "Mã phiếu QC: QC-20260730-123\n"
    const match = task.description?.match(/Mã phiếu QC: (QC-[A-Z0-9-]+)/);
    if (match) {
      const qcCode = match[1];
      console.log(`Task ${task.id} matches QC Code: ${qcCode}`);
      
      const qc = await prisma.qualityInspection.findUnique({
        where: { code: qcCode }
      });

      if (qc && qc.status === "Đã hoàn thành") {
        console.log(`QC is completed! Updating task...`);
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: "completed",
            actualResult: JSON.stringify([{ msg: `Đã đồng bộ từ cập nhật QC: ${qc.result}. Phiếu: ${qc.code}`, date: new Date().toISOString() }])
          }
        });
      } else if (!qc) {
        console.log(`QC not found for code ${qcCode}. It might have been deleted. Should we complete it?`);
        // We'll mark it as completed to clean up the board for the user
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: "completed",
            actualResult: JSON.stringify([{ msg: `Hệ thống tự động dọn dẹp do phiếu QC đã bị xóa.`, date: new Date().toISOString() }])
          }
        });
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
