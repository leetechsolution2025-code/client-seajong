const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const root = await prisma.inventoryCategory.findUnique({
    where: { code: 'SP_THANH_PHAM' }
  });
  console.log("SP_THANH_PHAM:", root ? root.name : "Not found");
  
  const cats = await prisma.category.findMany({ where: { type: 'danh_muc_thanh_pham' } });
  console.log("danh_muc_thanh_pham count:", cats.length);
  
  const kh = await prisma.warehouse.findUnique({ where: { code: 'KHO-CHINH' }});
  console.log("KHO-CHINH type:", kh ? kh.type : "Not found");
}
main().catch(console.error).finally(() => prisma.$disconnect());
