const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const activeIndustryCode = "sanitary";
  const allCats = await prisma.inventoryCategory.findMany();
  
  const allowedCodes = ["VT_TP_CHINH", "VT_BP_DIEU_HUONG", "VT_TAY_CAM", "VT_TRUC_DIEU_HUONG", "VT_CHUP_TRANG_TRI", "VT_CHAN_CHAU", "VT_LINH_KIEN_KHAC"];
  
  allowedCodes.forEach(code => {
    const root = allCats.find(c => c.code === code);
    if (root) {
      console.log(`Root code ${code} found. parentId: ${root.parentId}`);
    } else {
        console.log(`Root code ${code} not found!`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
