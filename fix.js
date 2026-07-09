const fs = require('fs');

function revertStep1(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /<div className="d-flex flex-column">\s*<div className="px-4 pt-2 pb-0 bg-white">\s*<Tab[\s\S]*?onChange=\{\(key\) => setActiveTab\(key\)\}\s*\/>\s*<\/div>\s*<div className="row g-0 plan-row border-top">/,
    '<div className="row g-0 plan-row">'
  );
  // Also revert step 3
  content = content.replace(
    /<div className="d-flex flex-column h-100">\s*<div className="px-4 pt-2 pb-0 bg-white">\s*<Tab[\s\S]*?onChange=\{\(key\) => setActiveTab\(key\)\}\s*\/>\s*<\/div>\s*<div className="p-4 border-top">/,
    '<div className="p-4">'
  );
  fs.writeFileSync(file, content);
}

revertStep1('src/components/sales/plan/OemPlanTab.tsx');
revertStep1('src/components/sales/plan/SeajongPlanTab.tsx');
