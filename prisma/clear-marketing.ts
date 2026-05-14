import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Bắt đầu xoá dữ liệu Marketing...");

  try {
    // Xoá theo thứ tự để tránh lỗi ràng buộc khoá ngoại (mặc dù onDelete: Cascade đã xử lý phần lớn)
    
    console.log("- Đang xoá MarketingAnnualPlan...");
    await prisma.marketingAnnualPlan.deleteMany({});

    console.log("- Đang xoá MarketingMonthlyPlan & Tasks...");
    await prisma.marketingMonthlyPlan.deleteMany({});
    
    console.log("- Đang xoá MarketingYearlyPlan & relations...");
    await prisma.marketingYearlyPlan.deleteMany({});

    console.log("- Đang xoá OutlineMarketingPlan (Chiến lược)...");
    await prisma.outlineMarketingPlan.deleteMany({});

    console.log("- Đang xoá MarketingCampaign & Lead...");
    await prisma.marketingCampaign.deleteMany({});
    
    console.log("- Đang xoá Media Assets...");
    await prisma.mediaAsset.deleteMany({});
    await prisma.mediaFolder.deleteMany({});

    console.log("- Đang xoá Social Connections...");
    await prisma.socialConnection.deleteMany({});

    console.log("✅ Đã xoá sạch dữ liệu Marketing.");
  } catch (error) {
    console.error("❌ Lỗi khi xoá dữ liệu:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
