const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emp = await prisma.employee.findFirst({
    where: { fullName: { contains: "Nguyễn Văn Hùng" } },
    select: { id: true, code: true, fullName: true, status: true, isInsuranceEnrolled: true, departmentCode: true, position: true, baseSalary: true, socialInsuranceNumber: true }
  });
  console.log(JSON.stringify(emp, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
