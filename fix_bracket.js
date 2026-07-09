const fs = require('fs');

function fixBrackets(file) {
  let content = fs.readFileSync(file, 'utf8');
  // Replace `</div>\n)}` with `\n)}` for the first two occurrences (Step 1 and Step 2)
  let occurrences = 0;
  content = content.replace(/\s*<\/div>\n\s*\)\}/g, (match) => {
    occurrences++;
    if (occurrences <= 2) {
      return '\n          )}';
    }
    return match;
  });
  fs.writeFileSync(file, content);
}

fixBrackets('src/components/sales/plan/OemPlanTab.tsx');
fixBrackets('src/components/sales/plan/SeajongPlanTab.tsx');
