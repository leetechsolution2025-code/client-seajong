import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const categoryId = 'cms1574qm0e1bgrm63oygsxp3'; // Vòi Lavabo OEM
  const warehouseId = 'cmoit7ttx0000i4514gkqzm1k'; // KVP

  const where: any = {};
  
  where.stocks = { some: { warehouseId } };
  
  // category filter logic
  const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { code: true } });
  const invCat = await prisma.inventoryCategory.findUnique({ where: { id: categoryId }, select: { code: true } });
  const targetCode = cat?.code || invCat?.code;

  if (targetCode) {
    where.OR = [
      { category: { code: targetCode } },
      { erpCategory: { code: targetCode } }
    ];
  }

  console.log("WHERE Clause:", JSON.stringify(where, null, 2));

  const items = await prisma.inventoryItem.findMany({
    where,
    select: { code: true, tenHang: true, erpCategoryId: true, categoryId: true }
  });

  console.log("Found items:", items);
}

main().catch(console.error).finally(() => prisma.$disconnect());
