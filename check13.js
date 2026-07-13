const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const root = await prisma.inventoryCategory.findFirst({ where: { code: 'SP_VESINH' } });
  console.log("Root:", root);
  if (root) {
    const children = await prisma.inventoryCategory.findMany({ where: { parentId: root.id } });
    console.log("Children:", children);
  }
}
main();
