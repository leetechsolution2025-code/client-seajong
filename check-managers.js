const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emp = await prisma.employee.findMany({ select: { fullName: true, position: true, level: true, departmentName: true } });
  console.log("Managers:", emp.filter(e => String(e.level).toLowerCase().includes('trưởng') || String(e.position).toLowerCase().includes('trưởng')));
}
main();
