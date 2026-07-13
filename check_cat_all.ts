import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const catId = 'cmr8oi3vo001g8ot0kpa84ywx';
  const c = await prisma.category.findUnique({ where: { id: catId } });
  console.log("Category:", !!c, c?.name);
}
main().finally(() => prisma.$disconnect());
