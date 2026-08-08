import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const usersWithCrm = await prisma.user.findMany({
    where: {
      permissions: { contains: '"crm"' },
    },
    select: {
      id: true,
      name: true,
      email: true,
      employee: {
        select: {
          id: true,
          fullName: true,
          status: true,
          workEmail: true,
          phone: true,
          departmentCode: true,
        },
      },
    },
  });

  const result: any[] = [];
  
  for (const u of usersWithCrm) {
    let empDept: string | null = null;
    let empName = null;

    if (u.employee && u.employee.status === "active") {
      empDept = u.employee.departmentCode;
      empName = u.employee.fullName;
    } else if (!u.employee) {
      const empByEmail = await prisma.employee.findFirst({
        where: { workEmail: u.email, status: "active" },
        select: { fullName: true, departmentCode: true },
      });
      if (empByEmail) {
        empDept = empByEmail.departmentCode;
        empName = empByEmail.fullName;
      }
    }

    result.push({ email: u.email, name: u.name, empName, empDept });
  }

  console.log("All CRM users:", result);
}

main().finally(() => prisma.$disconnect())
