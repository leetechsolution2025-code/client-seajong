const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany({
    where: { type: 'vat_tu_san_xuat' }
  });
  console.log("Material Categories in Category (vat_tu_san_xuat):");
  console.log(cats.map(c => ({ id: c.id, code: c.code, name: c.name, parentId: c.parentId })));
}
main();
