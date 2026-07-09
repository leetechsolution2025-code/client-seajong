const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { role: true } });
  console.log("Roles:", [...new Set(users.map(u => u.role))]);
}
main();
