const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { name: true, role: true, email: true } });
  console.log(users.filter(u => u.name && u.name.includes('Vụ') || (u.email && u.email.includes('admin'))));
}
main().catch(console.error).finally(() => prisma.$disconnect());
