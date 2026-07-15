const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const activeIndustryCode = "sanitary";

  console.log("=== MATERIAL ===");
  const allCats = await prisma.inventoryCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" }
  });
  
  const industryMaterialRootCodes = {
    "wood_door": ["VT_CHINH", "VT_PHU", "VT_TIEU_HAO", "PHU_KIEN", "VTNL"],
    "sanitary": ["VT_TP_CHINH", "VT_BP_DIEU_HUONG", "VT_TAY_CAM", "VT_TRUC_DIEU_HUONG", "VT_CHUP_TRANG_TRI", "VT_CHAN_CHAU", "VT_LINH_KIEN_KHAC"],
    "building_materials": ["VLXD_THO", "VLXD_HOAN_THIEN", "SAT_THEP", "CAT_DA_SOI", "XI_MANG", "GACH_XAY"]
  };
  
  const allowedCodes = industryMaterialRootCodes[activeIndustryCode];
  const allowedIds = new Set();
  
  allowedCodes.forEach(code => {
    const root = allCats.find(c => c.code === code);
    if (root) {
      allowedIds.add(root.id);
      if (code !== "SP_VESINH" && code !== "SP_GO" && code !== "SP_VLXD") {
        const collectDescendants = (parentId) => {
          allCats.forEach(cat => {
            if (cat.parentId === parentId) {
              allowedIds.add(cat.id);
              collectDescendants(cat.id);
            }
          });
        };
        collectDescendants(root.id);
      }
    } else {
        console.log(`Root code ${code} not found!`);
    }
  });
  
  console.log("Allowed MATERIAL Ids count:", allowedIds.size);

  console.log("=== PRODUCT ===");
  const rootCategory = allCats.find(c => c.code === "SP_THANH_PHAM" && c.parentId === null);
  if (rootCategory) {
    const descendantIds = [rootCategory.id];
    const collectDescendants = (parentId) => {
      allCats.forEach(cat => {
        if (cat.parentId === parentId) {
          descendantIds.push(cat.id);
          collectDescendants(cat.id);
        }
      });
    };
    collectDescendants(rootCategory.id);
    console.log("PRODUCT descendant count:", descendantIds.length);
  } else {
    console.log("SP_THANH_PHAM not found!");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
