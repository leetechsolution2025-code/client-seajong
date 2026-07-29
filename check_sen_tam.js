const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.inventoryCategory.findMany({
    where: { name: { contains: 'Sen tắm' } }
  });
  console.log("Categories found:", cats.map(c => ({ id: c.id, name: c.name })));

  if (cats.length > 0) {
    const items = await prisma.inventoryItem.findMany({
      where: { categoryId: cats[0].id },
      include: { stocks: true }
    });
    console.log(`Found ${items.length} items in category ${cats[0].name}`);
    for (const item of items) {
      console.log(`- ${item.tenHang} (loai: ${item.loai}) stocks: ${JSON.stringify(item.stocks.map(s => s.warehouseId))}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
