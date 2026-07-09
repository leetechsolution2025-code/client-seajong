const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  const employees = await prisma.employee.findMany({ select: { id: true, fullName: true, level: true, userId: true } });
  console.log("USERS:", users.slice(0, 5));
  console.log("EMPLOYEES:", employees.slice(0, 5));
}
main();
