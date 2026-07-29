import fs from 'fs';

const p1 = 'src/app/api/plan-finance/stock-movements/batch-kiem-kho/route.ts';
let code1 = fs.readFileSync(p1, 'utf-8');
code1 = code1.replace(/\/\/ ĐỒNG BỘ SANG MATERIAL STOCK NẾU LÀ VẬT TƯ[\s\S]*?if\s*\(mat\)\s*\{[\s\S]*?\}\s*\}\s*\}/, '');
fs.writeFileSync(p1, code1);

const p2 = 'src/app/api/plan-finance/stock-movements/route.ts';
let code2 = fs.readFileSync(p2, 'utf-8');
code2 = code2.replace(/const targetWId =[\s\S]*?if\s*\(mat\s*&&\s*targetWId\)\s*\{[\s\S]*?\}\s*\}/, '');
code2 = code2.replace(/const invItemInfo2 =[\s\S]*?if\s*\(mat\s*&&\s*adjWarehouseId\)\s*\{[\s\S]*?\}\s*\}/, '');
fs.writeFileSync(p2, code2);

console.log('Patched stock-movements');
