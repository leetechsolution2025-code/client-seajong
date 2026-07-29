const fs = require('fs');
const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

const replacement = `      }

      // Kiểm tra xem categoryId thuộc về InventoryCategory hay Category
      const isInventoryCategory = categoryId ? await prisma.inventoryCategory.findUnique({
        where: { id: categoryId }
      }) : null;
`;

// we just replace the first instance of `      // Tự động gán vào kho` inside POST with the declaration + the comment
content = content.replace(
  /\/\/ Tự động gán vào kho/,
  `// Kiểm tra xem categoryId thuộc về InventoryCategory hay Category
      const isInventoryCategory = categoryId ? await prisma.inventoryCategory.findUnique({
        where: { id: categoryId }
      }) : null;

      // Tự động gán vào kho`
);

fs.writeFileSync(file, content);
console.log("Fixed isInventoryCategory!");
