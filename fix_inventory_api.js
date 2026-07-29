const fs = require('fs');

const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

const regex = /\/\/\s*Lấy mã nhóm từ Category và lọc động trên mã hàng\s*const selectedCat = await prisma\.category\.findUnique\(\{ where: \{ id: categoryId \} \}\);\s*if \(selectedCat && selectedCat\.code\) \{\s*where\.maThayThe = \{ startsWith: selectedCat\.code \};\s*\} else \{\s*where\.erpCategoryId = categoryId;\s*\}/;

const replacement = `// Kho sản xuất chỉ dùng danh mục ERP nội bộ
          where.erpCategoryId = categoryId;`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log("Reverted to where.erpCategoryId = categoryId");
