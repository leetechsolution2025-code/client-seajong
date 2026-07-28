const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany({ where: { name: { contains: 'Sen' } }});
  console.log("Categories in Category table:", cats);
}
main().catch(console.error).finally(() => prisma.$disconnect());
