const fs = require('fs');
const file = 'src/app/(dashboard)/production/bom/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// fetchProducts (GET)
content = content.replace(
  /\/api\/production\/manufactured-products\?search=\$\{encodeURIComponent\(search\)\}&categoryId=\$\{filterCategoryId\}/g,
  '/api/logistics/inventory?warehouseCode=KVP&search=${encodeURIComponent(search)}&categoryId=${filterCategoryId}'
);

// reload selected product
content = content.replace(
  /\/api\/production\/manufactured-products\?search=\$\{selectedProduct\.code\}/g,
  '/api/logistics/inventory?warehouseCode=KVP&search=${selectedProduct.code}'
);

// Delete product
content = content.replace(
  /\/api\/production\/manufactured-products\/\$\{editProductId\}/g,
  '/api/logistics/inventory/${editProductId}'
);

// Save product URL
content = content.replace(
  /const url = editProductId \? \`\/api\/logistics\/inventory\/\$\{editProductId\}\` : "\/api\/production\/manufactured-products";/g,
  'const url = "/api/logistics/inventory";'
);
content = content.replace(
  /const url = editProductId \? \`\/api\/production\/manufactured-products\/\$\{editProductId\}\` : "\/api\/production\/manufactured-products";/g,
  'const url = "/api/logistics/inventory";'
);

// Save product Body
content = content.replace(
  /body: JSON.stringify\(newProduct\)/g,
  'body: JSON.stringify({ ...newProduct, id: editProductId || undefined, warehouseCode: "KHO-THANHPHAM", loai: "thanh-pham", tenHang: newProduct.name, categoryId: newProduct.categoryId, donVi: newProduct.unit, ghiChu: newProduct.notes })'
);

fs.writeFileSync(file, content);
console.log("Fixed BOM page manufactured-products!");
