const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({ take: 5 });
  if (employees.length === 0) {
    console.log("No employees found to seed promotions.");
    return;
  }

  const requesterId = employees[0].id;

  const requests = [
    {
      employeeId: employees[1]?.id || employees[0].id,
      type: "PROMOTION",
      currentDept: "Phòng Kinh doanh",
      currentPos: "Nhân viên",
      targetDept: "Phòng Kinh doanh",
      targetPos: "Trưởng nhóm",
      reason: "Hoàn thành xuất sắc KPI quý 1",
      status: "RECEIVING",
      requesterId
    },
    {
      employeeId: employees[2]?.id || employees[0].id,
      type: "TRANSFER",
      currentDept: "Phòng Marketing",
      currentPos: "Designer",
      targetDept: "Phòng Sản phẩm",
      targetPos: "Product Designer",
      reason: "Phù hợp với định hướng phát triển mới",
      status: "INTERVIEWING",
      requesterId,
      interviewDate: new Date(Date.now() + 86400000).toISOString(),
      interviewLocation: "Phòng họp Lầu 2"
    },
    {
      employeeId: employees[3]?.id || employees[0].id,
      type: "DEMOTION",
      currentDept: "Phòng Kỹ thuật",
      currentPos: "Lead Engineer",
      targetDept: "Phòng Kỹ thuật",
      targetPos: "Senior Engineer",
      reason: "Nguyện vọng cá nhân giảm áp lực công việc",
      status: "CONCLUSION",
      requesterId,
      interviewNote: "Đã phỏng vấn, đồng ý với nguyện vọng",
      competencyScore: 9,
      suitabilityScore: 10,
      hrApproved: true
    }
  ];

  for (const data of requests) {
    await prisma.promotionRequest.create({ data });
  }

  console.log("Seeded 3 promotion requests.");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
