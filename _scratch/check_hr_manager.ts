
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      fullName: true,
      position: true,
      departmentName: true,
      userId: true
    }
  });
  console.log(JSON.stringify(employees, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
