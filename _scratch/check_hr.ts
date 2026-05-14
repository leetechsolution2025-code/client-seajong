import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const hrEmployees = await prisma.employee.findMany({
    where: { departmentCode: 'hr' }
  });
  console.log('HR Employees:', JSON.stringify(hrEmployees, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
