const fs = require('fs');
const files = [
  'src/app/(dashboard)/finance/debts/DebtReconciliationModal.tsx',
  'src/app/(dashboard)/finance/debts/page.tsx',
  'src/app/(dashboard)/finance/debts/DebtPaymentOffcanvas.tsx'
];

const helperFn = `\nconst formatCurrency = (val: number) => (Math.round(val / 1000) * 1000).toLocaleString("vi-VN");\n\n`;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Inject formatCurrency after imports (find the first empty line after imports or before component definition)
  if (!content.includes('const formatCurrency =')) {
     const importEndMatch = content.match(/import .*;\n\n/);
     if (importEndMatch) {
        content = content.replace(importEndMatch[0], importEndMatch[0] + helperFn);
     } else {
        // Fallback: put it right before "export default function" or "export function" or "export const"
        content = content.replace(/(export (default )?(function|const|let) [a-zA-Z0-9_]+)/, helperFn + '$1');
     }
  }

  // Replace standard matches: (variable).toLocaleString("vi-VN") -> formatCurrency(variable)
  // Careful with expressions like (activePrintItem.debt.amount - activePrintItem.debt.paidAmount).toLocaleString("vi-VN")
  // Using a regex for a simple object/variable path:
  content = content.replace(/([a-zA-Z0-9_\.\[\]\(\)\-\+\*\/ ]+)\.toLocaleString\("vi-VN"\)/g, (match, p1) => {
    // p1 could be totals.openingBalance or (totals.openingBalance)
    // we just wrap it: formatCurrency(p1)
    return `formatCurrency(${p1})`;
  });

  fs.writeFileSync(file, content);
  console.log('Processed', file);
});
