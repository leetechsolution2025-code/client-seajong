import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Đang tiến hành trả toàn bộ hàng đã giữ về kho...");
  const result = await prisma.inventoryStock.updateMany({
    where: {
      soLuongGiu: { gt: 0 }
    },
    data: {
      soLuongGiu: 0
    }
  });
  console.log(`Đã trả lại kho thành công cho ${result.count} lô hàng có số lượng đang giữ.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
