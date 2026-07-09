const fs = require('fs');
let file = 'src/components/sales/plan/OemPlanTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix step 1
// Search for `border-top` in step 1, it was added as `<div className="row g-0 plan-row border-top">`
// At the end of step 1, we need an extra `</div>`
content = content.replace(
  /(\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\)}\n\n\s*\{\/\* STEP 2)/,
  '  </div>\n$1'
);

// Fix step 2
// At the end of step 2, we need an extra `</div>`
content = content.replace(
  /(\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\)}\n\n\s*\{\/\* STEP 3)/,
  '  </div>\n$1'
);

fs.writeFileSync(file, content);
