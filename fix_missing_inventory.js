const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.saleOrderItem.findMany({
    where: { inventoryItemId: null }
  });
  for (let item of items) {
    const inv = await prisma.inventoryItem.findFirst({
      where: { tenHang: item.tenHang }
    });
    if (inv) {
      await prisma.saleOrderItem.update({
        where: { id: item.id },
        data: { inventoryItemId: inv.id }
      });
      console.log(`Updated ${item.tenHang} to ${inv.id}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
