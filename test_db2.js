const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const cats = await prisma.category.findMany({ where: { type: "vat_tu_san_xuat", parentId: null } });
  console.log("Root Material Categories:", cats.map(c => ({ id: c.id, name: c.name, code: c.code })));
}
run();
