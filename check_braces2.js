const fs = require('fs');
const content = fs.readFileSync('src/app/api/plan-finance/sales/[id]/route.ts', 'utf-8');
const lines = content.split('\n');

let openCount = 0;
let transactionStarted = false;
let startLine = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const updated = await prisma.$transaction(async (tx) => {')) {
    transactionStarted = true;
    startLine = i;
  }
  if (transactionStarted) {
    for (const char of line) {
      if (char === '{') openCount++;
      if (char === '}') openCount--;
    }
    if (i === 816) {
      console.log('Balance at 817 (before closing):', openCount);
    }
  }
}
