const fs = require('fs');
const content = fs.readFileSync('src/app/api/plan-finance/sales/[id]/route.ts', 'utf-8');
const lines = content.split('\n');

let openCount = 0;
let transactionStarted = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const updated = await prisma.$transaction(async (tx) => {')) {
    transactionStarted = true;
  }
  if (transactionStarted) {
    let prevOpenCount = openCount;
    for (const char of line) {
      if (char === '{') openCount++;
      if (char === '}') openCount--;
    }
    if (i >= 288 && i <= 400 && (openCount === 1 || openCount === 2 || prevOpenCount === 1 || prevOpenCount === 2)) {
      console.log(`Line ${i + 1}: ${openCount} -> ${line}`);
    }
  }
}
