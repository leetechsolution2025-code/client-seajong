import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.saleOrder.findMany({
    where: {
      saleOrderItems: {
        some: { tenHang: { contains: 'CSC01S' } }
      }
    },
    include: { saleOrderItems: true }
  });
  console.log(`Found ${orders.length} orders with CSC01S`);
  for (const o of orders) {
    console.log(`Order ${o.code}, status ${o.trangThai}, items:`, o.saleOrderItems.map(i => ({ tenHang: i.tenHang, qty: i.soLuong })));
  }

  const quotations = await prisma.quotation.findMany({
    where: {
      items: {
        some: { tenHang: { contains: 'CSC01S' } }
      }
    },
    include: { items: true }
  });
  console.log(`Found ${quotations.length} quotations with CSC01S`);
  for (const q of quotations) {
    console.log(`Quotation ${q.code}, status ${q.trangThai}, items:`, q.items.map(i => ({ tenHang: i.tenHang, qty: i.soLuong })));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
