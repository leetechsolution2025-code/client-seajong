import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findFirst({ where: { code: 'DHBL-20260713-01' } });
  if (order) {
    await prisma.saleOrder.update({
      where: { id: order.id },
      data: { trangThai: 'pending', keToanDuyet: 'pending' }
    });
    // Find tasks related to this order and delete them so they are regenerated
    await prisma.task.deleteMany({
      where: { title: { contains: order.code } }
    });
    console.log("Order reset successfully");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
