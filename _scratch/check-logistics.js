const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emps = await prisma.employee.findMany({
    select: {
      fullName: true,
      departmentCode: true,
      departmentName: true,
      position: true,
      userId: true
    }
  });
  console.log("=== EMPLOYEES ===");
  emps.forEach(e => {
    console.log(`${e.fullName}: deptCode=${e.departmentCode}, deptName=${e.departmentName}, pos=${e.position}, userId=${e.userId}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
