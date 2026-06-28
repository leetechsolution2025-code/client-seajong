import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== UPDATING CATEGORY NAME IN DATABASE ===");

  const updated = await prisma.category.updateMany({
    where: { type: "vat_tu_san_xuat", code: "VT_BP_DIEU_HUONG" },
    data: { name: "Bộ phận điều hướng và ngắt mở nước" }
  });
  console.log(`Updated ${updated.count} Category records to 'Bộ phận điều hướng và ngắt mở nước'`);

  console.log("=== COMPLETED CATEGORY NAME UPDATE ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
