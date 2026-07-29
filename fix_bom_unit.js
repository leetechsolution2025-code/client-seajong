const fs = require('fs');
const file = 'src/app/(dashboard)/production/bom/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(/selectedProduct\.unit/g, '(selectedProduct.donVi || selectedProduct.unit)');
content = content.replace(/product\.unit/g, '(product.donVi || product.unit)');

fs.writeFileSync(file, content);
console.log("Fixed product units in BOM page!");
