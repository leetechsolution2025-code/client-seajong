const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { erpCategoryId: { not: null } },
    include: {
      erpCategory: true,
      category: true,
      stocks: {
        include: { warehouse: true }
      }
    }
  });

  if (item) {
    console.log("Mã hàng:", item.code);
    console.log("Mã nhóm PM (ERP Category Code):", item.erpCategory ? item.erpCategory.code : 'N/A');
    console.log("Mã nhóm đồng bộ (Inv Category Code):", item.category ? item.category.code : 'N/A');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
