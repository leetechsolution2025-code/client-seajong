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
    console.log("Tìm thấy hàng hoá:");
    console.log("Tên hàng:", item.tenHang);
    console.log("Mã hàng:", item.code);
    console.log("erpCategoryId (Danh mục ERP):", item.erpCategoryId);
    console.log("Tên Danh mục ERP:", item.erpCategory ? item.erpCategory.name : 'N/A');
    console.log("categoryId (Danh mục Đồng bộ):", item.categoryId);
    console.log("Kho đang chứa:", item.stocks.map(s => s.warehouse.code).join(", "));
  } else {
    console.log("Không có hàng hoá nào có erpCategoryId.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
