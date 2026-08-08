import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const emps = await prisma.employee.findMany({
    select: { fullName: true, departmentCode: true, status: true, userId: true },
  });
  console.log("All employees:", emps);

  const users = await prisma.user.findMany({
    select: { name: true, email: true, permissions: true }
  });
  console.log("All users:", users);
}

main().finally(() => prisma.$disconnect())
