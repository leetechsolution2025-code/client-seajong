const fs = require('fs');

const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

// 1. Remove the autoErpCategoryId string splitting logic from POST and PUT
const postPutRegex = /let autoErpCategoryId = categoryId \|\| null;\s*if \(maThayThe\) \{\s*const parts = maThayThe\.split\('-'\);\s*if \(parts\.length >= 2\) \{\s*const pmCode = parts\.slice\(0, 2\)\.join\('-'\);\s*const matchedCat = await prisma\.category\.findFirst\(\{ where: \{ code: pmCode \} \}\);\s*if \(matchedCat\) \{\s*autoErpCategoryId = matchedCat\.id;\s*\}\s*\}\s*\}/g;

content = content.replace(postPutRegex, "");
content = content.replace(/erpCategoryId: autoErpCategoryId,/g, "erpCategoryId: categoryId || null,");

// 2. Change the GET filter logic to dynamically match maThayThe.startsWith(Category.code)
const getFilterRegex = /\/\/\s*Kho sản xuất chỉ dùng danh mục ERP nội bộ\s*where\.erpCategoryId = categoryId;/;
const getFilterReplacement = `// Lấy mã nhóm từ Category và lọc động trên mã hàng
          const selectedCat = await prisma.category.findUnique({ where: { id: categoryId } });
          if (selectedCat && selectedCat.code) {
            where.maThayThe = { startsWith: selectedCat.code };
          } else {
            where.erpCategoryId = categoryId;
          }`;
content = content.replace(getFilterRegex, getFilterReplacement);

fs.writeFileSync(file, content);
console.log("Simplified filter logic to use startsWith instead of splitting!");
