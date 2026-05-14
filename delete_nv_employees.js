const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Lấy tất cả ID nhân viên có mã NV
  const nvEmployees = await prisma.employee.findMany({
    where: { code: { startsWith: "NV" } },
    select: { id: true, code: true, userId: true }
  });
  const ids = nvEmployees.map(e => e.id);
  const userIds = nvEmployees.map(e => e.userId).filter(Boolean);
  console.log(`Found ${ids.length} NV employees, ${userIds.length} linked users`);

  // Xóa các bảng con liên quan theo thứ tự (tránh lỗi FK)
  const tables = [
    "insuranceBenefit",
    "insuranceHistory",
    "insuranceChange",
    "attendanceRecord",
    "lunchRegistration",
    "leaveRequest",
    "payrollRecord",
    "evaluation",
    "candidate",
  ];

  for (const table of tables) {
    try {
      if (prisma[table]) {
        const result = await prisma[table].deleteMany({ where: { employeeId: { in: ids } } });
        console.log(`- ${table}: xóa ${result.count}`);
      }
    } catch (e) {
      console.log(`- ${table}: bỏ qua (${e.message.split('\n')[0]})`);
    }
  }

  // Xóa employee
  const deleted = await prisma.employee.deleteMany({
    where: { code: { startsWith: "NV" } }
  });
  console.log(`\n✅ Đã xóa ${deleted.count} nhân viên NV`);

  // Xóa User tài khoản liên kết (nếu có)
  if (userIds.length > 0) {
    try {
      const deletedUsers = await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
      console.log(`✅ Đã xóa ${deletedUsers.count} tài khoản User liên kết`);
    } catch (e) {
      console.log(`⚠ Không xóa được User: ${e.message.split('\n')[0]}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
