import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const qcTask = await prisma.task.findFirst({
    where: { title: { contains: "QC-20260730-482" }, deptCode: "logistics" }
  });

  if (qcTask) {
    const qc = await prisma.qualityInspection.findUnique({
      where: { code: 'QC-20260730-482' }
    });
    
    if (qc && qc.metadata) {
      const meta = JSON.parse(qc.metadata as string);
      const qty = meta.totalQuantity || 1;
      
      await prisma.task.update({
        where: { id: qcTask.id },
        data: {
          actualResult: JSON.stringify([
            { tenHang: qc.productName, soLuong: qty, donVi: "Bộ", type: "Kho Thành Phẩm", isShortage: false }
          ])
        }
      });
      console.log(`Updated task ${qcTask.id} to have quantity ${qty} Bộ`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
