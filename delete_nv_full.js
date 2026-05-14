const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nvEmployees = await prisma.employee.findMany({
    where: { code: { startsWith: "NV" } },
    select: { id: true, code: true, userId: true }
  });
  const ids = nvEmployees.map(e => e.id);
  const userIds = nvEmployees.map(e => e.userId).filter(Boolean);
  console.log(`Xóa ${ids.length} nhân viên NV, ${userIds.length} user liên kết\n`);

  // Xóa các bảng con theo thứ tự FK - bảng không có Cascade
  const steps = [
    // Insurance
    () => prisma.insuranceBenefit.deleteMany({ where: { employeeId: { in: ids } } }),
    () => prisma.insuranceHistory.deleteMany({ where: { employeeId: { in: ids } } }),
    () => prisma.insuranceChange.deleteMany({ where: { employeeId: { in: ids } } }),
    // Attendance
    () => prisma.attendance.deleteMany({ where: { employeeId: { in: ids } } }),
    // Payroll
    () => prisma.payroll.deleteMany({ where: { employeeId: { in: ids } } }),
    // Promotion / Salary Adj / Personal Requests
    () => prisma.promotionRequest.deleteMany({ where: { employeeId: { in: ids } } }),
    () => prisma.salaryAdjustmentRequest.deleteMany({ where: { employeeId: { in: ids } } }),
    () => prisma.personalRequest.deleteMany({ where: { employeeId: { in: ids } } }),
    () => prisma.terminationRequest.deleteMany({ where: { employeeId: { in: ids } } }),
    // LaborContract & EmploymentHistory have Cascade so will auto-delete
  ];

  const names = [
    "InsuranceBenefit", "InsuranceHistory", "InsuranceChange",
    "Attendance", "Payroll",
    "PromotionRequest", "SalaryAdjustmentRequest", "PersonalRequest", "TerminationRequest",
  ];

  for (let i = 0; i < steps.length; i++) {
    try {
      const r = await steps[i]();
      console.log(`  ✅ ${names[i]}: xóa ${r.count}`);
    } catch (e) {
      console.log(`  ⚠  ${names[i]}: ${e.message.split('\n')[0]}`);
    }
  }

  // Cuối cùng xóa Employee
  const deleted = await prisma.employee.deleteMany({
    where: { code: { startsWith: "NV" } }
  });
  console.log(`\n✅ Employee: xóa ${deleted.count} nhân viên NV`);

  // Xóa User liên kết
  if (userIds.length > 0) {
    try {
      const du = await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      console.log(`✅ User: xóa ${du.count} tài khoản`);
    } catch (e) {
      console.log(`⚠  User: ${e.message.split('\n')[0]}`);
    }
  }

  console.log("\nHoàn tất dọn sạch!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
