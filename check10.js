const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.inventoryCategory.findMany({
    where: { parentId: 'cmq0rroot0000vesinh123456' } // The root ID from the seed script!
  });
  console.log("Material Categories under cmq0rroot0000vesinh123456:");
  console.log(cats.map(c => ({ id: c.id, code: c.code, name: c.name })));

  const cats2 = await prisma.inventoryCategory.findMany({
    where: { parentId: 'cmq0rrootprod0000vesinh' } // The root ID for products!
  });
  console.log("Product Categories under cmq0rrootprod0000vesinh:");
  console.log(cats2.map(c => ({ id: c.id, code: c.code, name: c.name })));
}
main();
