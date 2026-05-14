
import { prisma } from "../src/lib/prisma";

async function seedExpenses() {
  const categories = await prisma.category.findMany({
    where: { type: "expense_type" }
  });
  
  if (categories.length === 0) {
    console.log("No expense categories found. Please create some first.");
    return;
  }

  const statuses = ["pending", "approved", "paid", "rejected"];
  const expenses = [];

  // Generate data for Jan to May 2026
  for (let month = 0; month <= 4; month++) { // 0 = Jan, 4 = May
    const numExpenses = 5 + Math.floor(Math.random() * 5); // 5-10 per month
    for (let i = 0; i < numExpenses; i++) {
      const day = 1 + Math.floor(Math.random() * 28);
      const date = new Date(2026, month, day);
      const cat = categories[Math.floor(Math.random() * categories.length)];
      
      expenses.push({
        tenChiPhi: `Chi phí ${cat.name} đợt ${i + 1}`,
        loai: cat.code,
        soTien: 500000 + Math.floor(Math.random() * 5000000),
        ngayChiTra: date,
        nguoiChiTra: "Hệ thống tự động",
        trangThai: statuses[Math.floor(Math.random() * statuses.length)],
        ghiChu: `Dữ liệu mẫu cho tháng ${month + 1}`,
      });
    }
  }

  console.log(`Seeding ${expenses.length} expenses...`);
  
  // Clear existing (optional, but better for a clean demo)
  // await prisma.expense.deleteMany({});

  for (const ex of expenses) {
    await prisma.expense.create({ data: ex });
  }

  console.log("Seeding complete!");
}

seedExpenses();
