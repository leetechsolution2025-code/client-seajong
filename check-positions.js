const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emp = await prisma.employee.findMany({ select: { position: true, level: true, departmentName: true } });
  console.log("Positions:", [...new Set(emp.map(e => e.position))]);
  console.log("Levels:", [...new Set(emp.map(e => e.level))]);
}
main();
