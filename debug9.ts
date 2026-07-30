import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findUnique({
    where: { code: 'DBH-20260730-01' },
    include: { saleOrderItems: true }
  });
  console.log(JSON.stringify(order, null, 2));

  const prodTask = await prisma.task.findFirst({
    where: { title: { contains: 'DBH-20260730-01' }, deptCode: 'production' }
  });
  console.log("prodTask:", JSON.stringify(prodTask, null, 2));
}
main().finally(() => prisma.$disconnect());
