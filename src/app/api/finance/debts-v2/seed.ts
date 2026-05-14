import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning old debts...");
  await (prisma.debt as any).deleteMany({});

  console.log("Seeding diverse debt data...");
  const now = new Date();
  
  const sampleDebts = [
    // PHẢI THU (RECEIVABLE)
    {
      type: "RECEIVABLE",
      partnerName: "Công ty TNHH MTV Thành Công",
      amount: 150000000,
      paidAmount: 50000000,
      dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // Quá hạn 5 ngày
      status: "PARTIAL",
      referenceId: "HĐ2024-001",
      description: "Hợp đồng cung cấp thiết bị vệ sinh Seajong"
    },
    {
      type: "RECEIVABLE",
      partnerName: "Khách hàng Nguyễn Văn A",
      amount: 45000000,
      paidAmount: 0,
      dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // Hạn trong 10 ngày tới
      status: "UNPAID",
      referenceId: "HĐ2024-002",
      description: "Đơn hàng lẻ"
    },
    {
      type: "RECEIVABLE",
      partnerName: "Xây dựng Hòa Bình",
      amount: 1000000000,
      paidAmount: 1000000000,
      dueDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), 
      status: "PAID",
      referenceId: "HĐ2024-003",
      description: "Dự án chung cư cao cấp"
    },
    {
      type: "RECEIVABLE",
      partnerName: "Nội thất Deco",
      amount: 80000000,
      paidAmount: 10000000,
      dueDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), // Hạn trong 45 ngày tới (30-60 ngày)
      status: "PARTIAL",
      referenceId: "HĐ2024-004",
      description: "Cung cấp linh kiện"
    },
    {
      type: "RECEIVABLE",
      partnerName: "Đại lý Cẩm Phả",
      amount: 120000000,
      paidAmount: 0,
      dueDate: new Date(now.getTime() + 70 * 24 * 60 * 60 * 1000), // Hạn > 60 ngày
      status: "UNPAID",
      referenceId: "HĐ2024-005",
      description: "Hợp đồng phân phối khu vực"
    },

    // PHẢI TRẢ (PAYABLE)
    {
      type: "PAYABLE",
      partnerName: "Nhà cung cấp Phụ kiện Việt",
      amount: 200000000,
      paidAmount: 150000000,
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: "PARTIAL",
      referenceId: "NK-001",
      description: "Nhập hàng linh kiện vòi nước"
    },
    {
      type: "PAYABLE",
      partnerName: "Công ty Logistics Global",
      amount: 35000000,
      paidAmount: 0,
      dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Quá hạn trả
      status: "UNPAID",
      referenceId: "VC-2024",
      description: "Cước vận chuyển quý 1"
    },
    {
      type: "PAYABLE",
      partnerName: "Điện lực Hà Nội",
      amount: 12500000,
      paidAmount: 12500000,
      dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      status: "PAID",
      referenceId: "E-2024-05",
      description: "Tiền điện tháng 5"
    },

    // NỢ VAY (LOAN)
    {
      type: "LOAN",
      partnerName: "Ngân hàng Vietcombank",
      amount: 5000000000,
      paidAmount: 1200000000,
      dueDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), 
      interestRate: 8.5,
      status: "PARTIAL",
      referenceId: "LOAN-VCB-2024",
      description: "Vay vốn lưu động kinh doanh"
    },
    {
      type: "LOAN",
      partnerName: "Ngân hàng BIDV",
      amount: 2000000000,
      paidAmount: 2000000000,
      dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      interestRate: 9.0,
      status: "PAID",
      referenceId: "LOAN-BIDV-2023",
      description: "Vay mua xe tải vận chuyển"
    },
    {
      type: "LOAN",
      partnerName: "Ngân hàng MB Bank",
      amount: 1500000000,
      paidAmount: 0,
      dueDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      interestRate: 7.8,
      status: "UNPAID",
      referenceId: "LOAN-MB-2024",
      description: "Vay tín chấp sản xuất"
    }
  ];

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
