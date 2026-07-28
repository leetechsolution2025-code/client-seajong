const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { tenHang: { contains: "Sen tắm nóng lạnh" } },
    include: {
      dinhMuc: true,
      dinhMucVatTus: true,
    }
  });
  console.log("ITEM:", JSON.stringify(item, null, 2));

  if (item) {
    const stocks = await prisma.inventoryStock.findMany({
      where: { inventoryItemId: item.id },
      include: { warehouse: true }
    });
    console.log("STOCKS:", JSON.stringify(stocks, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
