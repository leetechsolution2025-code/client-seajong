const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const cats = await prisma.category.findMany({ where: { type: "danh_muc_thanh_pham", parentId: null } });
  console.log("Root Product Categories:", cats.map(c => ({ id: c.id, name: c.name, code: c.code })));
}
run();
