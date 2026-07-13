const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log("=== DANH MỤC TRONG BẢNG InventoryCategory ===");
  const invCats = await prisma.inventoryCategory.findMany({
    where: { parentId: null }
  });
  console.log("Root InventoryCategories:", invCats.map(c => ({ id: c.id, code: c.code, name: c.name })));

  console.log("\n=== DANH MỤC TRONG BẢNG Category (danh_muc_thanh_pham) ===");
  const mfpCats = await prisma.category.findMany({
    where: { type: 'danh_muc_thanh_pham' }
  });
  console.log("Manufactured Product Categories:", mfpCats.map(c => ({ id: c.id, code: c.code, name: c.name })));

  console.log("\n=== DANH MỤC TRONG BẢNG Category (defects) ===");
  const defectCats = await prisma.category.findMany({
    where: { type: 'defects' }
  });
  console.log("Defect Categories:", defectCats.map(c => ({ id: c.id, code: c.code, name: c.name })));
}
main();
