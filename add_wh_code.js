const fs = require('fs');
const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

const regex = /const warehouseId = searchParams\.get\("warehouseId"\);/;
const replacement = `let warehouseId = searchParams.get("warehouseId");
    const warehouseCodeQ = searchParams.get("warehouseCode");
    if (!warehouseId && warehouseCodeQ) {
      const whCode = await prisma.warehouse.findFirst({ where: { code: warehouseCodeQ }, select: { id: true } });
      if (whCode) warehouseId = whCode.id;
    }`;

if (!content.includes('warehouseCodeQ')) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log("Added warehouseCode support");
}
