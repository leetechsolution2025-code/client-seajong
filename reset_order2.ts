import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findFirst({ where: { code: 'DHBL-20260714-01' } });
  if (order) {
    await prisma.saleOrder.update({
      where: { id: order.id },
      data: { trangThai: 'pending', keToanDuyet: 'pending' }
    });
    await prisma.task.deleteMany({
      where: { title: { contains: order.code } }
    });
    console.log("Order reset successfully: " + order.code);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
