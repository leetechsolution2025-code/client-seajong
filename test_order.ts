import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const orderId = "cms1m26we001h8ogf8049fu5a";
  const order = await prisma.saleOrder.findUnique({
    where: { id: orderId }
  });
  console.log("Order:", order);

  const pendingOrders = await prisma.saleOrder.findMany({
    where: {
      id: orderId,
      keToanDuyet: "approved",
      trangThaiKho: "in_stock",
      trangThai: { notIn: ["cancelled", "draft"] }
    }
  });
  console.log("Pending query result count:", pendingOrders.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
