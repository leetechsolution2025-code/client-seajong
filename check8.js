const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log("=== VẬT TƯ (MATERIAL) CATEGORIES in InventoryCategory ===");
  const matCats = await prisma.inventoryCategory.findMany({
    where: { 
      code: { startsWith: 'VT_' }
    }
  });
  console.log(matCats.map(c => ({ id: c.id, code: c.code, name: c.name })));
}
main();
