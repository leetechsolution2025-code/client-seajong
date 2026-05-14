import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding recruitment data...");

  const req1 = await prisma.recruitmentRequest.upsert({
    where: { id: "REQ-002" },
    update: {},
    create: {
      id: "REQ-002",
      department: "Kỹ thuật",
      position: "Lập trình viên React",
      quantity: 2,
      requestedBy: "Trần Thị B",
      status: "Approved",
      priority: "Normal",
      description: "Phát triển các tính năng mới cho dashboard quản trị doanh nghiệp.",
      requirements: "Thành thạo React, Next.js, TypeScript. Hiểu biết về State Management."
    }
  });

  const req2 = await prisma.recruitmentRequest.upsert({
    where: { id: "REQ-001" },
    update: {},
    create: {
      id: "REQ-001",
      department: "Kinh doanh",
      position: "Nhân viên Sales",
      quantity: 5,
      requestedBy: "Nguyễn Văn A",
      status: "Pending",
      priority: "High",
      description: "Mở rộng thị trường khu vực miền Nam.",
      requirements: "Tốt nghiệp Đại học, ít nhất 1 năm kinh nghiệm sales."
    }
  });

  console.log("Seeded requests:", { req1, req2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
