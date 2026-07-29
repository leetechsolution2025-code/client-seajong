const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const boxCat = await prisma.category.findFirst({ where: { name: 'Vỏ hộp' } });
  console.log("Box Cat ID:", boxCat.id);

  const items = await prisma.inventoryItem.findMany({
    where: { maThayThe: { startsWith: 'nsp-xsuq' } },
    select: { id: true, code: true, maThayThe: true, erpCategoryId: true }
  });
  console.log("Items:", items);
}
main().finally(() => prisma.$disconnect());
