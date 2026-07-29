const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { categoryId: 'cmrimw4v800048or1w55u9yhk' },
    include: { stocks: true }
  });
  console.log(`Found ${items.length} items in category Sen tắm`);
  for (const item of items) {
    console.log(`- ${item.tenHang} (loai: ${item.loai}) stocks: ${JSON.stringify(item.stocks.map(s => s.warehouseId))}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
