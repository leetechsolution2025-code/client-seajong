const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const items = await prisma.inventoryItem.findMany({
    where: { loai: 'vat-tu', erpCategoryId: null, maThayThe: { not: null } }
  });

  let updatedCount = 0;
  for (const item of items) {
    if (!item.maThayThe) continue;
    // format is nsp-voi-01, we want nsp-voi
    const parts = item.maThayThe.split('-');
    if (parts.length >= 3) {
      const code = parts[0] + '-' + parts[1];
      const cat = await prisma.category.findFirst({ where: { code: code } });
      if (cat) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { erpCategoryId: cat.id }
        });
        updatedCount++;
      }
    } else if (parts.length == 2) {
      const code = parts[0] + '-' + parts[1];
      const cat = await prisma.category.findFirst({ where: { code: code } });
      if (cat) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { erpCategoryId: cat.id }
        });
        updatedCount++;
      }
    }
  }
  console.log('Updated ' + updatedCount + ' items');
  await prisma.$disconnect();
}
run();
