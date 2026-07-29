const fs = require('fs');
const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

// Insert isInventoryCategory after "const body = await req.json();"
const searchStr = 'const body = await req.json();';
const replaceStr = `const body = await req.json();
    const { categoryId } = body;
    const isInventoryCategory = categoryId ? await prisma.inventoryCategory.findUnique({ where: { id: categoryId } }) : null;`;

content = content.replace(searchStr, replaceStr);
fs.writeFileSync(file, content);
console.log("Fixed isInventoryCategory properly!");
