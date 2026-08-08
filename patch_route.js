const fs = require('fs');
const file = 'src/app/api/finance/debts-v2/route.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  'const oldDebt = await (prisma.debt as any).findUnique({ where: { id } });',
  'console.log("PUT DEBT CALLED WITH ID:", id);\n    const oldDebt = await (prisma.debt as any).findUnique({ where: { id } });\n    console.log("OLD DEBT FOUND:", oldDebt ? oldDebt.id : "NULL");'
);
fs.writeFileSync(file, code);
