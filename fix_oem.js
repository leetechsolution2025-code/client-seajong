const fs = require('fs');
let file = 'src/components/sales/plan/OemPlanTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// The block from 1920 to 1940:
content = content.replace(
  /(\s*)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)}\s*\{\/\* STEP 3/g,
  '$1  </div>\n$1</div>\n$1)}\n\n$1{/* STEP 3' // Needs manual fix, let's just do a simpler replace.
);

fs.writeFileSync(file, content);
