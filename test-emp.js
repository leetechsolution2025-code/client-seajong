const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const e = await prisma.employee.findFirst({ where: { fullName: { contains: 'Phượng' } } });
  console.log("Employee name:", e ? e.fullName : null);
}
main().finally(() => prisma.$disconnect());
