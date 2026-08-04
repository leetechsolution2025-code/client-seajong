const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const u = await prisma.user.findUnique({ where: { id: "cmra9ujl400078oq7i01odhra" } });
  console.log(u);
}
main().catch(console.error).finally(() => prisma.$disconnect());
