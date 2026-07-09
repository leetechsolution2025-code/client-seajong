const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log("Users mapping:", users.map(u => ({ id: u.id, name: u.name })).find(u => u.id === 'cmojwl1vq0000i4714uf4s9k5'));
}
main().finally(() => prisma.$disconnect());
