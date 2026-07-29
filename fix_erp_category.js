const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const erpCats = await prisma.category.findMany({
    where: { type: 'vat_tu_san_xuat' }
  });

  const items = await prisma.inventoryItem.findMany({
    where: { 
      stocks: { some: { warehouse: { code: 'KVP' } } }
    }
  });

  let updatedCount = 0;
  for (const item of items) {
    if (!item.maThayThe) continue;
    
    // mã nhóm PM is the first two parts of maThayThe, e.g. "nsp-bcs-03" -> "nsp-bcs"
    const parts = item.maThayThe.split('-');
    if (parts.length >= 2) {
      const pmCode = parts.slice(0, 2).join('-');
      
      const matchedCat = erpCats.find(c => c.code === pmCode);
      if (matchedCat && item.erpCategoryId !== matchedCat.id) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { erpCategoryId: matchedCat.id }
        });
        updatedCount++;
      } else if (!matchedCat) {
        // console.log(`No category found for PM code: ${pmCode} (Item: ${item.code})`);
      }
    }
  }

  console.log(`Updated erpCategoryId for ${updatedCount} items using maThayThe PM code.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
