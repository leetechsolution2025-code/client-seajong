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
    for (const char of line) {
      if (char === '{') openCount++;
      if (char === '}') openCount--;
    }
    if (i === 323) console.log('Line 324 (index 323):', openCount);
    if (i === 780) console.log('Line 781 (index 780):', openCount);
    if (i === 781) console.log('Line 782 (index 781):', openCount);
    if (i === 782) console.log('Line 783 (index 782):', openCount);
  }
}
