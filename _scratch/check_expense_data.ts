
import { prisma } from "../src/lib/prisma";

async function checkData() {
  const categories = await prisma.category.findMany({
    where: { type: "trang_thai_chi_phi" }
  });
  console.log("=== Status Categories ===");
  console.log(JSON.stringify(categories, null, 2));

  const expenses = await prisma.expense.findMany({
    take: 5
  });
  console.log("\n=== Sample Expenses ===");
  console.log(JSON.stringify(expenses, null, 2));
}

checkData();
