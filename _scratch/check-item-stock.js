const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { tenHang: { contains: "Sen tắm nóng lạnh 01S" } },
    include: {
      stocks: {
        include: { warehouse: true }
      }
    }
  });
  console.log("=== INVENTORY ITEM ===");
  if (!item) {
    console.log("Not found item");
    return;
  }
  console.log(`${item.tenHang} (code: ${item.code}): total soLuong=${item.soLuong}`);
  console.log("=== STOCKS ===");
  item.stocks.forEach(s => {
    console.log(`Warehouse: ${s.warehouse.name} (${s.warehouse.code}) -> soLuong=${s.soLuong}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
