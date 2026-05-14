const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const employees = await prisma.employee.findMany({ take: 1 });
    if (employees.length === 0) {
      console.log("No employees found");
      return;
    }
    const id = employees[0].id;
    console.log("Testing fetch for ID:", id);
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        laborContracts: { orderBy: { startDate: "desc" } },
        employmentHistory: { orderBy: { effectiveDate: "desc" } },
        user: { select: { email: true, role: true } },
      },
    });
    console.log("Success:", !!employee);
    console.log("Data:", JSON.stringify(employee, null, 2).substring(0, 500));
  } catch (error) {
    console.error("Prisma query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
