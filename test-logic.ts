import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findUnique({ where: { code: "DBH-20260730-01" } });
  
  let deadline = order?.ngayGiao ? new Date(order.ngayGiao) : null;
  if (deadline) deadline.setDate(deadline.getDate() - 2);
  
  console.log("ngayHoanThanh mapped value:", deadline);
}
main();
