import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const employeeId = "cmra9ujl500098oq7a9fruhng"; // Valid ID
  const startOfMonth = new Date("2026-08-01T00:00:00Z");
  const endOfMonth = new Date("2026-08-31T23:59:59Z");
  try {
        const customers = await prisma.customer.findMany({ 
          where: { nguoiChamSocId: employeeId },
          select: { id: true, createdAt: true }
        });
        const customerIds = customers.map(c => c.id);
        const totalManagedCustomers = customerIds.length;
        console.log("customerIds", customerIds);

        const orders = await prisma.saleOrder.findMany({
          where: {
            customerId: { in: customerIds },
            trangThai: { notIn: ["cancelled", "draft"] },
            createdAt: { gte: startOfMonth, lte: endOfMonth }
          },
          include: { paymentNotifications: true }
        });
        let dynamicSales = orders.reduce((sum, o) => sum + (o.tongTien || 0), 0);
        console.log("dynamicSales", dynamicSales);

        const payments = await prisma.paymentNotification.findMany({
          where: {
            status: "verified",
            verifiedAt: { gte: startOfMonth, lte: endOfMonth },
            OR: [
              { customerId: { in: customerIds } },
              { saleOrder: { customerId: { in: customerIds } } }
            ]
          }
        });
        const paymentSum = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        let manualSum = 0;
        orders.forEach(o => {
          let linkedSum = 0;
          if (o.paymentNotifications) {
            linkedSum = o.paymentNotifications.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
          }
          const manual = Math.max(0, (o.daThanhToan || 0) - linkedSum);
          manualSum += manual;
        });

        console.log("dynamicRevenue", paymentSum + manualSum);
  } catch (e) {
    console.error("Lỗi:", e);
  }
}
main();
