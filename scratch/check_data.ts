import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: {
      departmentName: {
        contains: "Marketing"
      }
    },
    select: {
      fullName: true,
      position: true,
      level: true,
      code: true
    }
  });

  const positions = await prisma.category.findMany({
    where: {
      type: "position"
    }
  });

  console.log("Employees:", JSON.stringify(employees, null, 2));
  console.log("Positions:", JSON.stringify(positions, null, 2));
}

main().finally(() => prisma.$disconnect());
