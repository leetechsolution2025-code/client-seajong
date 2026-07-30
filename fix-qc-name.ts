import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.notification.updateMany({
    where: { 
      title: { contains: "Yêu cầu kiểm tra chất lượng (OQC) mới" }
    },
    data: {
      title: "🔬 Yêu cầu kiểm tra chất lượng đầu ra",
    }
  });

  await prisma.qualityInspection.updateMany({
    where: { 
      productName: { contains: "Thành phẩm lệnh sản xuất" }
    },
    data: {
      notes: "Yêu cầu kiểm tra chất lượng đầu ra cho đơn hàng",
    }
  });
  console.log("Updated existing QC records");
}
main();
