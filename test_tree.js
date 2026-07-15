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
  const allCats = await prisma.inventoryCategory.findMany();
  
  // PRODUCT test
  const rootCategory = allCats.find(c => c.code === "SP_THANH_PHAM" && c.parentId === null);
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
  const result = buildCategoryTree(filteredCats);
  console.log("PRODUCT Tree:", result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
