const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Thiết bị vệ sinh", code: "TH_VESINH" },
    { name: "Thiết bị nhà bếp", code: "TH_NHABEP" },
    { name: "Sen vòi", code: "TH_SENVOI", parentCode: "TH_VESINH" },
    { name: "Bồn cầu", code: "TH_BONCAU", parentCode: "TH_VESINH" },
    { name: "Chậu rửa", code: "TH_CHAURUA", parentCode: "TH_VESINH" },
    { name: "Bồn tắm", code: "TH_BONTAM", parentCode: "TH_VESINH" },
    { name: "Phụ kiện vệ sinh", code: "TH_PKVESINH", parentCode: "TH_VESINH" },
    { name: "Chậu rửa bát", code: "TH_CHAURUABAT", parentCode: "TH_NHABEP" },
    { name: "Vòi rửa bát", code: "TH_VOIRUABAT", parentCode: "TH_NHABEP" },
    { name: "Phụ kiện nhà bếp", code: "TH_PKNHABEP", parentCode: "TH_NHABEP" },
  ];

  for (const cat of categories) {
    let parentId = null;
    if (cat.parentCode) {
      const parent = await prisma.category.findFirst({ where: { code: cat.parentCode, type: 'danh_muc_thanh_pham' } });
      if (parent) parentId = parent.id;
    }
    
    await prisma.category.upsert({
      where: { type_code: { type: 'danh_muc_thanh_pham', code: cat.code } },
      update: { name: cat.name, parentId },
      create: { type: 'danh_muc_thanh_pham', code: cat.code, name: cat.name, parentId }
    });
  }
  console.log("Seeded danh_muc_thanh_pham successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
