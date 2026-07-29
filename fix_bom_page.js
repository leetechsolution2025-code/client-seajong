const fs = require('fs');
const file = 'src/app/(dashboard)/production/bom/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Fix fetchProducts for left column (GET)
// Original: fetch(`/api/logistics/inventory?search=${encodeURIComponent(search)}&categoryId=${filterCategoryId}`);
// Target: fetch(`/api/logistics/inventory?warehouseCode=KVP&search=${encodeURIComponent(search)}&categoryId=${filterCategoryId}`);
content = content.replace(
  /fetch\(\`\/api\/logistics\/inventory\?search=\$\{encodeURIComponent\(search\)\}&categoryId=\$\{filterCategoryId\}\`\)/g,
  'fetch(`/api/logistics/inventory?warehouseCode=KVP&search=${encodeURIComponent(search)}&categoryId=${filterCategoryId}`)'
);

// Fix reload selected product
// Original: fetch(`/api/logistics/inventory?search=${selectedProduct.code}`)
// Target: fetch(`/api/logistics/inventory?warehouseCode=KVP&search=${selectedProduct.code}`)
content = content.replace(
  /fetch\(\`\/api\/logistics\/inventory\?search=\$\{selectedProduct\.code\}\`\)/g,
  'fetch(`/api/logistics/inventory?warehouseCode=KVP&search=${selectedProduct.code}`)'
);

// Fix URL for save product
content = content.replace(
  /const url = editProductId \? \`\/api\/logistics\/inventory\/\$\{editProductId\}\` : "\/api\/logistics\/inventory";/g,
  'const url = "/api/logistics/inventory";'
);

// Fix body for save product
content = content.replace(
  /body: JSON.stringify\(newProduct\)/g,
  'body: JSON.stringify({ ...newProduct, id: editProductId || undefined, warehouseCode: "KHO-THANHPHAM" })'
);

fs.writeFileSync(file, content);
console.log("Fixed BOM page!");
