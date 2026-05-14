const fs = require('fs');
const path = require('path');

const filePath = '/Users/leanhvan/master-project/src/app/(dashboard)/marketing/plan/yearly/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the broken fetch URL if it exists
let fixedContent = content.replace(/fetch\(, \{ method: "DELETE" \}\)/g, 'fetch(`/api/marketing/plan/yearly?id=${selectedPlanId}`, { method: "DELETE" })');

// 2. Count braces
let openBraces = 0;
let closeBraces = 0;
for (let char of fixedContent) {
    if (char === '{') openBraces++;
    if (char === '}') closeBraces++;
}

console.log('Current braces:', { openBraces, closeBraces });

if (openBraces > closeBraces) {
    console.log(`Adding ${openBraces - closeBraces} missing closing braces at the end of the main component...`);
    // Find the last '}' before 'const Offcanvas'
    const marker = '// ── Shared UI Components ──────────────────────────────────────────────────────';
    const parts = fixedContent.split(marker);
    if (parts.length === 2) {
        // Add missing braces to the first part
        parts[0] = parts[0].trimEnd() + '\n' + '}'.repeat(openBraces - closeBraces) + '\n\n';
        fixedContent = parts.join(marker);
    }
}

fs.writeFileSync(filePath, fixedContent);
console.log('File page.tsx has been fixed and balanced.');
