const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding insurance data...");

  // 1. Find some employees
  const employees = await prisma.employee.findMany({ take: 5 });

  if (employees.length === 0) {
    console.log("No employees found to seed.");
    return;
  }

  // 2. Mark them as insurance enrolled
  for (const emp of employees) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: { isInsuranceEnrolled: true, socialInsuranceNumber: "BH-" + Math.floor(Math.random() * 100000000) }
    });

    // 3. Create history for May 2026
    await prisma.insuranceHistory.upsert({
      where: {
        employeeId_month_year: {
          employeeId: emp.id,
          month: 5,
          year: 2026
        }
      },
      update: {},
      create: {
        employeeId: emp.id,
        month: 5,
        year: 2026,
        insuranceSalary: emp.baseSalary || 10000000,
        employerAmount: (emp.baseSalary || 10000000) * 0.215,
        employeeAmount: (emp.baseSalary || 10000000) * 0.105,
        totalAmount: (emp.baseSalary || 10000000) * 0.32,
        status: "active"
      }
    });
  }

  // 4. Create some changes
  await prisma.insuranceChange.create({
    data: {
      employeeId: employees[0].id,
      type: "Báo tăng",
      effectiveDate: new Date("2026-05-01"),
      reason: "Nhân viên mới",
      status: "done"
    }
  });

  // 5. Create some benefits
  await prisma.insuranceBenefit.create({
    data: {
      employeeId: employees[1].id,
      regimeType: "Thai sản",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-10-01"),
      amount: 30000000,
      status: "approved"
    }
  });

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
