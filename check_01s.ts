import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { tenHang: { contains: "Sen tắm nóng lạnh 01S" } }
  });
  console.log(item);
}
main().catch(console.error).finally(() => prisma.$disconnect());
