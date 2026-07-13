const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function buildCategoryTree(flatList, parentId = null, level = 0) {
  const result = [];
  const children = flatList.filter(c => c.parentId === parentId);
  for (const child of children) {
    const node = {
      id: child.id,
      name: child.name,
      code: child.code,
      description: child.description,
      isHeader: level === 0,
      expanded: true,
      level,
      children: buildCategoryTree(flatList, child.id, level + 1)
    };
    if (node.children.length === 0) {
      delete node.children;
      delete node.expanded;
    }
    result.push(node);
  }
  return result;
}

async function main() {
  const allCats = await prisma.inventoryCategory.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" }
  });
  
  const rootCategory = await prisma.inventoryCategory.findFirst({
    where: { code: "SP_VESINH", parentId: null, isActive: true }
  });
  
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
    console.log("Filtered Cats count:", filteredCats.length);
    const result = buildCategoryTree(filteredCats);
    console.log("Result:", JSON.stringify(result, null, 2));
  }
}
main();
