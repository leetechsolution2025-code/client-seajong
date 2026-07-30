import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const qcTask = await prisma.task.findFirst({
    where: { title: { contains: "QC-20260730-482" }, deptCode: "logistics" }
  });

  if (qcTask) {
    const modelName = "Sen tắm nóng lạnh 02S";
    const qty = 2; // the actual missingQty
    
    await prisma.task.update({
      where: { id: qcTask.id },
      data: {
        actualResult: JSON.stringify([
          { tenHang: modelName, soLuong: qty, donVi: "Bộ", type: "Kho Thành Phẩm", isShortage: false }
        ])
      }
    });
    console.log(`Updated task ${qcTask.id} to have tenHang: ${modelName}, soLuong: ${qty}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
