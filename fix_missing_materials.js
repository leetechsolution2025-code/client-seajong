const fs = require('fs');
const file = 'src/components/finance/MissingMaterialsOffcanvas.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /fetch\("\/api\/logistics\/inventory"\)/g,
  'fetch("/api/logistics/inventory/missing")'
);

fs.writeFileSync(file, content);
console.log("Fixed MissingMaterialsOffcanvas!");
