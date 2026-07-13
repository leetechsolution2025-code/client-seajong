const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany({ 
    where: { type: 'danh_muc_thanh_pham' },
    select: { name: true, code: true, parent: { select: { name: true } } }
  });
  console.log(JSON.stringify(cats, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
