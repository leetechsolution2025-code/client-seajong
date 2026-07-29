const fs = require('fs');
const file = 'src/app/api/logistics/inventory/update-price-ratio/route.ts';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /\(prisma as any\)\.materialItem\.findMany/g,
  'prisma.inventoryItem.findMany'
);
content = content.replace(
  /\(prisma as any\)\.materialItem\.update/g,
  'prisma.inventoryItem.update'
);
content = content.replace(
  /price: /g,
  'giaNhap: '
);
content = content.replace(
  /price \* ratio/g,
  'giaNhap * ratio'
);
fs.writeFileSync(file, content);
console.log("Fixed update-price-ratio!");
