const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const materials = await prisma.category.count({ where: { type: 'vat_tu_san_xuat' } });
  const products = await prisma.category.count({ where: { type: 'danh_muc_thanh_pham' } });
  const defects = await prisma.category.count({ where: { type: 'defects' } });
  console.log(`materials: ${materials}, products: ${products}, defects: ${defects}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
