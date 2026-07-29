const fs = require('fs');
const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

// First, undo my mistake (remove the lines I just added)
content = content.replace(
  /const body = await req\.json\(\);\n\s*const \{ categoryId \} = body;\n\s*const isInventoryCategory = categoryId \? await prisma\.inventoryCategory\.findUnique\(\{ where: \{ id: categoryId \} \}\) : null;/g,
  'const body = await req.json();'
);

// Now add it properly AFTER the main destructuring:
const target = "} = body;";
const insertion = `} = body;

    const isInventoryCategory = categoryId ? await prisma.inventoryCategory.findUnique({ where: { id: categoryId } }) : null;`;

// We only want to replace the first occurrence (which is inside POST).
let replaced = false;
content = content.replace(/\} = body;/, match => {
  if (!replaced) {
    replaced = true;
    return insertion;
  }
  return match;
});

fs.writeFileSync(file, content);
console.log("Fixed redeclare block-scoped variable!");
