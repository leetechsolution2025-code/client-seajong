const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.inventoryCategory.findMany();
  
  const spThanhPham = cats.find(c => c.code === 'SP_THANH_PHAM');
  const thanhPhamChildren = cats.filter(c => c.parentId === spThanhPham?.id);
  console.log("SP_THANH_PHAM children isActive:");
  thanhPhamChildren.forEach(c => console.log(`- ${c.code} (${c.name}): isActive=${c.isActive}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
