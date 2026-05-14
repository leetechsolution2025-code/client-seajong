import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning old debts...");
  await (prisma.debt as any).deleteMany({});

  console.log("Generating 60+ diverse debt records...");
  const now = new Date();
  const types = ["RECEIVABLE", "PAYABLE", "LOAN"];
  const statuses = ["UNPAID", "PARTIAL", "PAID"];
  const partners = [
    "Công ty Xây dựng An Bình", "Tập đoàn Prime", "Nội thất Hoàn Mỹ", "Vật liệu Việt Nhật",
    "Ngân hàng Techcombank", "Ngân hàng VIB", "Điện lực Miền Bắc", "Cấp nước Hà Nội",
    "Khách hàng Trần Thị B", "Đại lý phân phối Hải Phòng", "Logistics Thành Đạt",
    "Nhà cung cấp Kính nổi", "Viglacera", "Prime Group", "TOTO Việt Nam"
  ];

  const sampleDebts = [];

  // Tạo dữ liệu ngẫu nhiên
  for (let i = 1; i <= 60; i++) {
    const type = i <= 30 ? "RECEIVABLE" : (i <= 50 ? "PAYABLE" : "LOAN");
    const partner = partners[Math.floor(Math.random() * partners.length)] + ` (Mẫu #${i})`;
    const amount = Math.floor(Math.random() * 500) * 1000000 + 10000000; // 10tr - 500tr
    const paidAmount = Math.random() > 0.5 ? Math.floor(Math.random() * amount) : (Math.random() > 0.8 ? amount : 0);
    
    // Ngày ngẫu nhiên từ -60 đến +90 ngày
    const daysOffset = Math.floor(Math.random() * 150) - 60;
    const dueDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);

    sampleDebts.push({
      type,
      partnerName: partner,
      amount,
      paidAmount,
      dueDate,
      interestRate: type === "LOAN" ? Number((7 + Math.random() * 5).toFixed(1)) : null,
      status: paidAmount === amount ? "PAID" : (paidAmount > 0 ? "PARTIAL" : "UNPAID"),
      referenceId: `REF-${2024}-${i.toString().padStart(3, "0")}`,
      description: `Dữ liệu mẫu kiểm thử giao diện số ${i}`
    });
  }

  // Thêm một số khoản nợ cụ thể để kiểm tra lọc
  sampleDebts.push({
    type: "RECEIVABLE",
    partnerName: "KHOẢN NỢ QUÁ HẠN NẶNG",
    amount: 500000000,
    paidAmount: 0,
    dueDate: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000), // Quá hạn 100 ngày
    status: "UNPAID",
    referenceId: "CRIT-001",
    description: "Kiểm tra lọc quá hạn > 60 ngày"
  });

  for (const debt of sampleDebts) {
    await (prisma.debt as any).create({ data: debt });
  }

  console.log(`Successfully seeded ${sampleDebts.length} debt records!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
