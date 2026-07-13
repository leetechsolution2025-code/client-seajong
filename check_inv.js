const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const root = await prisma.inventoryCategory.findFirst({ where: { code: 'SP_THANH_PHAM' } });
  if(!root) return console.log("No root");
  
  const children = await prisma.inventoryCategory.findMany({ where: { parentId: root.id } });
  for(const c of children) {
     const count = await prisma.inventoryItem.count({ where: { categoryId: c.id } });
     console.log(`${c.name} (${c.code}): ${count}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
