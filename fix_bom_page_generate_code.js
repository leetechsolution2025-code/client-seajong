const fs = require('fs');
const file = 'src/app/(dashboard)/production/bom/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /\/api\/production\/manufactured-products\/generate-code/g,
  '/api/logistics/inventory/generate-code'
);
content = content.replace(
  /\/api\/production\/manufactured-products\/apply-price-all/g,
  '/api/logistics/inventory/update-price-ratio'
);
fs.writeFileSync(file, content);
console.log("Fixed generate-code API path!");
