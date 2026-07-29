const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { attachWebImages } = require('./src/lib/sync-utils.js');

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { tenHang: { contains: 'SJ-580D' } }
  });
  console.log("Item:", item.webProductId, item.imageUrl);
  
  const batchList = [{
    id: "test",
    tenHang: item.tenHang,
    inventoryItemId: item.id,
    webProductId: item.webProductId,
    imageUrl: item.imageUrl,
    images: []
  }];
  
  const res = await attachWebImages(batchList);
  console.log("Result:", res[0].images);
}
main().finally(() => prisma.$disconnect());
