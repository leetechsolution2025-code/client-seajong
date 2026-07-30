import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findUnique({ where: { code: "DBH-20260730-01" } });
  console.log("ngayDat:", order?.ngayDat, "ngayGiao:", order?.ngayGiao);
}
main();
