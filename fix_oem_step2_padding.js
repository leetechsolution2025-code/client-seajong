const fs = require('fs');
let code = fs.readFileSync('src/components/sales/plan/OemPlanTab.tsx', 'utf8');

code = code.replace('<div className="d-flex flex-column h-100">', '<div className="d-flex flex-column h-100 p-4">');

fs.writeFileSync('src/components/sales/plan/OemPlanTab.tsx', code);
console.log("Updated padding for step 2");
