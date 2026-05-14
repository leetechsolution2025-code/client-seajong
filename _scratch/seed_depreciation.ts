
import { prisma } from "../src/lib/prisma";

async function seedDepreciation() {
  const categoryCode = "exp-20260401-8491-ewer"; // Khấu hao tài sản
  
  const assets = [
    { name: "Khấu hao Xe tải giao hàng", amount: 8500000 },
    { name: "Khấu hao Hệ thống máy CNC", amount: 15200000 },
    { name: "Khấu hao Trang thiết bị văn phòng", amount: 3500000 }
  ];

  const expenses = [];

  // Generate for Jan to May 2026
  for (let month = 0; month <= 4; month++) {
    const date = new Date(2026, month, 1); // Usually calculated at start/end of month
    for (const asset of assets) {
      expenses.push({
        tenChiPhi: asset.name,
        loai: categoryCode,
        soTien: asset.amount,
        ngayChiTra: date,
        nguoiChiTra: "Hệ thống tự động",
        trangThai: "paid",
        ghiChu: `Khấu hao định kỳ tháng ${month + 1}/2026`,
      });
    }
  }

  console.log(`Seeding ${expenses.length} depreciation entries...`);
  
  for (const ex of expenses) {
    await prisma.expense.create({ data: ex });
  }

  console.log("Depreciation seeding complete!");
}

seedDepreciation();
