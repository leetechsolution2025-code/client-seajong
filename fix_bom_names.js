const fs = require('fs');
const file = 'src/app/(dashboard)/production/bom/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Fix row.name (the left list item name)
content = content.replace(/row\.name/g, '(row.tenHang || row.name)');

// Fix product.name (the selected product title, etc.)
content = content.replace(/product\?\.name/g, '(product?.tenHang || product?.name)');
content = content.replace(/product\.name/g, '(product.tenHang || product.name)');

// selectedProduct.name
content = content.replace(/selectedProduct\?\.name/g, '(selectedProduct?.tenHang || selectedProduct?.name)');
content = content.replace(/selectedProduct\.name/g, '(selectedProduct.tenHang || selectedProduct.name)');

fs.writeFileSync(file, content);
console.log("Fixed product names in BOM page!");
