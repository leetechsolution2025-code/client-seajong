import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  try {
    const customerIds = ["c1"];
    const startOfMonth = new Date();
    const endOfMonth = new Date();
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
    console.log("Success", payments.length);
  } catch (e) {
    console.error("Error", e);
  }
}
main();
