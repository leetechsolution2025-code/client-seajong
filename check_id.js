const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const id = 'cmr8oir3b001i8ot086120ies';
  const c1 = await prisma.category.findUnique({ where: { id } });
  const c2 = await prisma.inventoryCategory.findUnique({ where: { id } });
  const c3 = await prisma.erpCategory.findUnique({ where: { id } });
  console.log('Category:', !!c1, c1?.name);
  console.log('InventoryCategory:', !!c2, c2?.name);
  console.log('ErpCategory:', !!c3, c3?.name);
}
main().finally(() => prisma.$disconnect());
