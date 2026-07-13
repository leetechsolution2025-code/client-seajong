const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Vòi nước", code: "TP_1", sortOrder: 1 },
    { name: "Sen tắm", code: "TP_2", sortOrder: 2 },
    { name: "Phụ kiện phòng tắm", code: "TP_3", sortOrder: 3 },
    { name: "Thiết bị khác", code: "TP_4", sortOrder: 4 },
    { name: "Vòi xịt vệ sinh", code: "TP_5", sortOrder: 5 },
    { name: "Bàn đá, Tủ chậu, Gương", code: "TP_6", sortOrder: 6 },
    { name: "Chậu rửa bát, Chậu lavabo", code: "TP_7", sortOrder: 7 },
    { name: "Linh kiện, Vật tư lắp ráp rời", code: "TP_8", sortOrder: 8 },
  ];

  // Xoá các danh mục linh tinh mà tôi đã lỡ tạo trước đó
  await prisma.category.deleteMany({
    where: { 
      type: 'danh_muc_thanh_pham',
      code: { in: ['TH_VESINH', 'TH_NHABEP', 'TH_SENVOI', 'TH_BONCAU', 'TH_CHAURUA', 'TH_BONTAM', 'TH_PKVESINH', 'TH_CHAURUABAT', 'TH_VOIRUABAT', 'TH_PKNHABEP'] }
    }
  });

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { type_code: { type: 'danh_muc_thanh_pham', code: cat.code } },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: { type: 'danh_muc_thanh_pham', code: cat.code, name: cat.name, sortOrder: cat.sortOrder }
    });
  }
  console.log("Seeded danh_muc_thanh_pham successfully with EXACT 8 categories.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
