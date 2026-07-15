import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const advancesData = [
  {
    employeeName: "Phạm Quang Việt",
    amount: 15000000,
    paidAmount: 5000000,
    reason: "Tạm ứng chi phí đi công tác miền Nam khảo sát đại lý",
    status: "APPROVED",
  },
  {
    employeeName: "Trần Thị Linh",
    amount: 5000000,
    paidAmount: 5000000,
    reason: "Tạm ứng mua sắm văn phòng phẩm tháng 7",
    status: "COMPLETED",
  },
  {
    employeeName: "Nguyễn Lê Dũng",
    amount: 25000000,
    paidAmount: 0,
    reason: "Tạm ứng chi phí tổ chức sự kiện ra mắt sản phẩm",
    status: "PENDING",
  },
  {
    employeeName: "Phạm Quang Việt",
    amount: 8000000,
    paidAmount: 3000000,
    reason: "Tạm ứng ngân sách chạy quảng cáo đợt 1",
    status: "APPROVED",
  },
  {
    employeeName: "Vũ Hùng Cường",
    amount: 12000000,
    paidAmount: 12000000,
    reason: "Tạm ứng mua phụ kiện thay thế cho xưởng mạ",
    status: "COMPLETED",
  },
  {
    employeeName: "Trần Thị Linh",
    amount: 3000000,
    paidAmount: 0,
    reason: "Tạm ứng tiền nước uống nhân viên quý 3",
    status: "PENDING",
  },
];

async function main() {
  console.log("Seeding advances mock data...");
  
  // Find or create employees first since we need employeeId
  const uniqueNames = [...new Set(advancesData.map(d => d.employeeName))];
  const employeeMap = new Map();

  for (const name of uniqueNames) {
    let employee = await prisma.employee.findFirst({
      where: { fullName: name }
    });

    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          fullName: name,
          workEmail: `${name.replace(/\s+/g, '').toLowerCase()}@seajong.com`,
          phone: "0123456789",
          position: "Nhân viên",
          code: `EMP-${Math.floor(Math.random() * 1000)}`,
          departmentCode: "DEP-001",
          departmentName: "Phòng ban chung",
        }
      });
    }
    employeeMap.set(name, employee.id);
  }

  // Create personal requests
  let counter = 1;
  const today = new Date();
  const dayStr = String(today.getDate()).padStart(2, '0');
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');
  const yearStr = today.getFullYear();

  for (const data of advancesData) {
    const employeeId = employeeMap.get(data.employeeName);
    const sequenceStr = String(counter).padStart(3, '0');
    const requestId = `YC-${dayStr}${monthStr}${yearStr}-${sequenceStr}`;
    counter++;

    const details = {
      financeType: "Tạm ứng",
      amount: data.amount,
      paymentMethod: "Chuyển khoản",
      bankInfo: "Techcombank",
      paidAmount: data.paidAmount, // Store mock paidAmount here
    };

    // Use upsert to avoid duplicate keys if run multiple times
    await prisma.personalRequest.upsert({
      where: { id: requestId },
      update: {
        status: data.status,
        reason: data.reason,
        details: JSON.stringify(details),
      },
      create: {
        id: requestId,
        employeeId: employeeId,
        type: "finance",
        status: data.status,
        reason: data.reason,
        details: JSON.stringify(details),
      }
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
