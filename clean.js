const fs = require('fs');

let file = 'src/components/sales/plan/OemPlanTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix step 1 closing
content = content.replace(
  /(\s*)\/>\n\s*<\/div>\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\)}\n\n\s*\{\/\* STEP 2/,
  '$1/>\n$1  </div>\n$1</div>\n$1</div>\n$1)}\n\n$1{/* STEP 2' // Actually this might fail if the match is wrong. Let's just do a substring search.
);

fs.writeFileSync(file, content);
