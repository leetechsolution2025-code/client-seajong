const fs = require('fs');
const file = 'src/app/api/plan-finance/sales/[id]/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Fix 1: materialId: vt.materialId (in GET API calculation)
code = code.replace(/where: \{ materialId: vt\.materialId \},/g, 'where: { materialId: vt.materialId || "" },');

// Fix 2: In PATCH API calculation, I used `mat.materialId`
code = code.replace(/where: \{ materialId: mat\.materialId \},/g, 'where: { materialId: mat.materialId || "" },');

fs.writeFileSync(file, code);
