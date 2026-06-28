import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Khởi tạo ngành thiết bị vệ sinh, nhà bếp
  const sanitaryIndustry = await prisma.industry.upsert({
    where: { code: "sanitary" },
    update: {
      name: "Kinh doanh thiết bị phòng tắm, nhà bếp",
      rootCategoryCode: "VTSX_VESINH"
    },
    create: {
      code: "sanitary",
      name: "Kinh doanh thiết bị phòng tắm, nhà bếp",
      rootCategoryCode: "VTSX_VESINH"
    }
  });

  console.log("✅ Ngành thiết bị vệ sinh:", sanitaryIndustry.id);

  // 2. Gán ngành này cho client seajong trong DB dự án con
  const client = await prisma.client.findFirst({
    where: { shortName: "seajong" }
  });

  if (client) {
    await prisma.client.update({
      where: { id: client.id },
      data: { industryId: sanitaryIndustry.id }
    });
    console.log(`✅ Đã gán industryId cho client ${client.name}`);
  } else {
    console.error("❌ Không tìm thấy client seajong!");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
