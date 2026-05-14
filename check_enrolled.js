const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const employees = await prisma.employee.findMany({
    where: { isInsuranceEnrolled: true, status: "active" },
    select: { id: true, code: true, fullName: true, position: true, departmentCode: true, baseSalary: true, socialInsuranceNumber: true }
  });
  console.log("Enrolled employees:", JSON.stringify(employees, null, 2));
  console.log("Count:", employees.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
