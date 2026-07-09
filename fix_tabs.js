const fs = require('fs');
const oemFile = 'src/components/sales/plan/OemPlanTab.tsx';
let oemContent = fs.readFileSync(oemFile, 'utf8');

// Fix step 1 closing (needs an extra </div>)
oemContent = oemContent.replace(
  /(\s*)(\s*<\/div>\n\s*<\/div>\n\s*\)}\n\n\s*\{\/\* STEP 2)/,
  '$1  </div>\n$1$2'
);

// Fix step 2 closing (needs an extra </div>)
// Step 2 ends with SPLIT LAYOUT 5-7 being closed
// Actually, let's look at the end of step 2 in OemPlanTab
oemContent = oemContent.replace(
  /(\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\)}\n\n\s*\{\/\* STEP 3)/,
  '  </div>\n$1'
);

fs.writeFileSync(oemFile, oemContent);
