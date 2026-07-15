const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function buildCategoryTree(flatList, parentId = null, level = 0) {
  const result = [];
  const children = flatList.filter(c => c.parentId === parentId);
  for (const child of children) {
    const hasChildren = flatList.some(c => c.parentId === child.id);
    result.push({
      id: child.id,
      name: child.name,
      code: child.code,
      isHeader: level === 0 && hasChildren,
      level
    });
    const childNodes = buildCategoryTree(flatList, child.id, level + 1);
    result.push(...childNodes);
  }
  return result;
}

async function main() {
  const warehouseId = 'cmoip699s0000i4almoh1zuqs'; // Kho hàng hoá
  const activeIndustryCode = "sanitary";
  
  const wh = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    select: { type: true }
  });
  
  const type = wh.type;
  console.log("Warehouse Type:", type);

  let result = [];
  
  if (type === "PRODUCT") {
    // ...
  } else if (type === "MATERIAL") {
    // ...
  } else if (type === "DEFECT") {
    // ...
  } else {
    // Default (KHO-CHINH) - Load by active industry
    const industryProductCodeMap = {
      "wood_door": "SP_GO",
      "sanitary": "SP_VESINH",
      "building_materials": "SP_VLXD"
    };
    const prodRootCode = industryProductCodeMap[activeIndustryCode] || "SP_GO";
    
    const allCats = await prisma.inventoryCategory.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" }
    });
    
    const rootCategory = allCats.find(c => c.code === prodRootCode && c.parentId === null);
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
      const filteredCats = allCats.filter(c => descendantIds.includes(c.id));
      result = buildCategoryTree(filteredCats);
    } else {
      result = buildCategoryTree(allCats);
    }
  }
  
  console.log("Returned categories count:", result.length);
  if (result.length > 0) {
      console.log("First category:", result[0].name);
  } else {
      const allCats = await prisma.inventoryCategory.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" }
      });
      const rootCategory = allCats.find(c => c.code === "SP_VESINH" && c.parentId === null);
      console.log("Does SP_VESINH exist? ", !!rootCategory);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
