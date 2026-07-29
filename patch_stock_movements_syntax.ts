import fs from 'fs';

const p1 = 'src/app/api/plan-finance/stock-movements/batch-kiem-kho/route.ts';
let code1 = fs.readFileSync(p1, 'utf-8');
code1 = code1.replace(/update:\s*\{\s*soLuong:\s*Math\.max\(0,\s*soLuongThucTe\)\s*\}\s*,[\s\S]*?\n\s*,/g, 'update: { soLuong: Math.max(0, soLuongThucTe) }');
fs.writeFileSync(p1, code1);

const p2 = 'src/app/api/plan-finance/stock-movements/route.ts';
let code2 = fs.readFileSync(p2, 'utf-8');
code2 = code2.replace(/update:\s*\{\s*soLuong:\s*soLuongMoi\s*\}\s*,[\s\S]*?\n\s*,/g, 'update: { soLuong: soLuongMoi }');
fs.writeFileSync(p2, code2);
