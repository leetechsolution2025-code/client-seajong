const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    where: { type: 'vat_tu_san_xuat' },
    select: { id: true, name: true, code: true }
  });
  console.log("ERP Categories (Vật tư):", cats);
  
  const invCats = await prisma.inventoryCategory.findMany({
    where: { name: { contains: 'Sen tắm' } },
    select: { id: true, name: true, code: true }
  });
  console.log("Inventory Categories:", invCats);
}

main().catch(console.error).finally(() => prisma.$disconnect());
