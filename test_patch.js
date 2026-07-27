const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = 'LSX-20260721-01';
  const codeCandidates = [
    orderId,
    orderId.replace('LSX', 'DBH'),
    orderId.replace('LSX', 'DHBL'),
    orderId.replace('LSX', 'DH')
  ];

  let order = null;
  order = await prisma.saleOrder.findUnique({
    where: { id: orderId },
    include: { saleOrderItems: true }
  });

  if (!order) {
    for (const candidate of codeCandidates) {
      order = await prisma.saleOrder.findUnique({
        where: { code: candidate },
        include: { saleOrderItems: true }
      });
      if (order) break;
    }
  }

  if (!order) {
    console.log("Order not found");
    return;
  }
  
  console.log("Order found:", order.code);
  
  const qaUsers = await prisma.employee.findMany({
    where: {
      status: "active",
      OR: [
        { departmentCode: { contains: "qa" } },
        { departmentName: { contains: "chất lượng" } },
        { departmentName: { contains: "Chất lượng" } }
      ]
    },
    select: { userId: true }
  });
  console.log("qaUsers:", qaUsers);
  
  let producedItems = [];
  for (const item of order.saleOrderItems) {
     const product = await prisma.manufacturedProduct.findFirst({
       where: { name: item.tenHang },
       include: { dinhMucs: true }
     });
     if (product && product.dinhMucs.length > 0) {
       producedItems.push(`${item.tenHang} (x${item.soLuong})`);
     }
  }
  console.log("producedItems:", producedItems);
  
  console.log("Finished logic check without error");
}
main().catch(console.error).finally(() => prisma.$disconnect());
