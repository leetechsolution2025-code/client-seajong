const fs = require('fs');
let code = fs.readFileSync('src/components/layout/SidebarAccordion.tsx', 'utf-8');

code = code.replace(
  'const isSales = pathname.startsWith("/sales");\n        const isKhoHangActive = isSales && pathname.includes("/inventory");\n        const href = isSales ? "/sales/inventory" : "/logistics";',
  `const currentModule = pathname.split("/")[1] || "";
        const isKhoHangActive = pathname.includes("/inventory");
        const href = ["sales", "board", "cs", "finance", "plan_finance"].includes(currentModule) ? \`/\${currentModule}/inventory\` : "/logistics";`
);

fs.writeFileSync('src/components/layout/SidebarAccordion.tsx', code);
console.log('Sidebar patched');
