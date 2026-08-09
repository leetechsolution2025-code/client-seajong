const fs = require('fs');
const file = 'src/app/(dashboard)/finance/debts/DebtReconciliationModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// The original line: const currentRemaining = debt.amount - debt.paidAmount;
// It should be: const currentRemaining = totals.openingBalance + totals.increase - totals.decrease;

content = content.replace(
  'const currentRemaining = debt.amount - debt.paidAmount;',
  'const currentRemaining = totals.openingBalance + totals.increase - totals.decrease;'
);

fs.writeFileSync(file, content);
console.log("Fixed currentRemaining calculation");
