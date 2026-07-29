const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const invCats = await prisma.inventoryCategory.findMany({
    where: { code: { startsWith: 'nsp' } }
  });
  console.log("Inventory Categories with nsp:", invCats);
}
main().finally(() => prisma.$disconnect());
