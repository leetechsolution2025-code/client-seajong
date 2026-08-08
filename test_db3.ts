import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const employees = await prisma.employee.findMany({
    where: { departmentCode: "sales" }
  });
  console.log("Sales employees:", employees.length);
}

main().finally(() => prisma.$disconnect())
