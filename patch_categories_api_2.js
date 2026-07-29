const fs = require('fs');
const file = 'src/app/api/logistics/categories/route.ts';
let content = fs.readFileSync(file, 'utf-8');

const regex = /if \(type === "MATERIAL"\) \{[\s\S]*?\} else \{[\s\S]*?result = buildCategoryTree\(allCats\);\n      \}\n    \}/;

const newBlock = `
    const allCats = await prisma.inventoryCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    });
    result = buildCategoryTree(allCats);
`;

if (regex.test(content)) {
  content = content.replace(regex, newBlock);
  fs.writeFileSync(file, content);
  console.log("Patched categories API successfully!");
} else {
  console.log("Could not find block in categories API with regex");
}
