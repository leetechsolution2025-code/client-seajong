import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.saleOrder.findMany({
    where: {
      trangThai: 'cancelled'
    },
    include: { saleOrderItems: true }
  });
  console.log(`Found ${orders.length} cancelled orders`);
  for (const o of orders) {
    if (o.saleOrderItems.some(i => i.tenHang.includes('CSC01S'))) {
      console.log(`Cancelled Order ${o.code} has CSC01S!`);
    }
  }

  const quotations = await prisma.quotation.findMany({
    where: {
      trangThai: 'cancelled'
    },
    include: { items: true }
  });
  console.log(`Found ${quotations.length} cancelled quotations`);
  for (const q of quotations) {
    if (q.items.some(i => i.tenHang.includes('CSC01S'))) {
      console.log(`Cancelled Quotation ${q.code} has CSC01S!`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
