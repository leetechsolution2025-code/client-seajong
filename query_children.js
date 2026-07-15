const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.inventoryCategory.findMany();
  
  const spVesinh = cats.find(c => c.code === 'SP_VESINH');
  const spThanhPham = cats.find(c => c.code === 'SP_THANH_PHAM');
  
  const vesinhChildren = cats.filter(c => c.parentId === spVesinh?.id);
  console.log("SP_VESINH children:");
  vesinhChildren.forEach(c => console.log(`- ${c.code} (${c.name})`));
  
  const thanhPhamChildren = cats.filter(c => c.parentId === spThanhPham?.id);
  console.log("\nSP_THANH_PHAM children:");
  thanhPhamChildren.forEach(c => console.log(`- ${c.code} (${c.name})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
