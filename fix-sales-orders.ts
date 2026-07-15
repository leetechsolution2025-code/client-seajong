import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.saleOrder.findMany({
    where: { tongTien: { gt: 0 } }
  });
  
  let updatedCount = 0;
  for (const order of orders) {
    if (order.daThanhToan >= order.tongTien && (order.keToanDuyet !== "approved" || order.trangThai !== "completed")) {
      await prisma.saleOrder.update({
        where: { id: order.id },
        data: { trangThai: "completed", keToanDuyet: "approved" }
      });
      updatedCount++;
      console.log(`Updated Order ${order.code || order.id} to completed/approved.`);
    }
  }
  console.log(`Finished. Updated ${updatedCount} orders.`);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
