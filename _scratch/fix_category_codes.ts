
import { prisma } from "../src/lib/prisma";

async function fixCategories() {
  const mapping: Record<string, string> = {
    "Chờ duyệt": "pending",
    "Đã duyệt": "approved",
    "Hoàn thành": "paid",
    "Từ chối": "rejected"
  };

  const categories = await prisma.category.findMany({
    where: { type: "trang_thai_chi_phi" }
  });

  for (const cat of categories) {
    const newCode = mapping[cat.name];
    if (newCode) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { code: newCode }
      });
      console.log(`Updated ${cat.name} code to ${newCode}`);
    }
  }
}

fixCategories();
