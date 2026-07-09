const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${currentYear + 1}-01-01T00:00:00.000Z`);

  try {
    const saleOrderItems = await prisma.saleOrderItem.findMany({
      where: {
        saleOrder: {
          createdAt: { gte: startOfYear, lt: endOfYear },
          trangThai: { notIn: ["draft", "cancelled"] }
        }
      },
      include: {
        inventoryItem: true
      }
    });
    console.log("Success, found items:", saleOrderItems.length);
  } catch(e) {
    console.error("Fetch error:", e.message);
  }
}
main().finally(() => prisma.$disconnect());
