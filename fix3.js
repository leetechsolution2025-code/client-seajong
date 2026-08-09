const fs = require('fs');
const files = [
  'src/app/(dashboard)/finance/debts/DebtReconciliationModal.tsx',
  'src/app/(dashboard)/finance/debts/page.tsx',
  'src/app/(dashboard)/finance/debts/DebtPaymentOffcanvas.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /const formatCurrency = \(val: number\) =>\s*formatCurrency\(\s*\(Math\.round\(val \/ 1000\) \* 1000\)\);/,
    'const formatCurrency = (val: number) => (Math.round(val / 1000) * 1000).toLocaleString("vi-VN");'
  );
  fs.writeFileSync(file, content);
});
