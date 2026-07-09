const fs = require('fs');
let content = fs.readFileSync('src/app/api/seajong/sync/route.ts', 'utf8');

// replace thanhPhamWh and phuKienWh with hangHoaWh
content = content.replace(/const thanhPhamWh = await prisma\.warehouse\.findFirst\(\{\s*where: \{ code: "KHO-THANHPHAM" \}\s*\}\);/g, 'const hangHoaWh = await prisma.warehouse.findFirst({ where: { code: "KHO-CHINH" } });');
content = content.replace(/const phuKienWh = await prisma\.warehouse\.findFirst\(\{\s*where: \{ code: "KHO-PHUKIEN" \}\s*\}\);/g, '');

content = content.replace(/const targetWarehouseId = \(prefix === "PK" \? phuKienWh\?\.id : thanhPhamWh\?\.id\) \|\| thanhPhamWh\?\.id \|\| "";/g, 'const targetWarehouseId = hangHoaWh?.id || "";');

fs.writeFileSync('src/app/api/seajong/sync/route.ts', content);
console.log('Patched seajong sync');
