const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany({
    where: { type: 'danh_muc_vat_tu' }
  });
  console.log("Material Categories in Category (danh_muc_vat_tu):", cats.map(c => ({ id: c.id, code: c.code, name: c.name })));
}
main();
