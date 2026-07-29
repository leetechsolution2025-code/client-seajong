const fs = require('fs');

const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

const regex = /include: \{\s*category: \{ select: \{ id: true, name: true \} \},\s*stocks: \{ include: \{ warehouse: true \} \},\s*dinhMuc: true,\s*\}/g;

const replacement = `include: {
          category: { select: { id: true, name: true, code: true } },
          erpCategory: { select: { id: true, name: true, code: true } },
          stocks: { include: { warehouse: true } },
          dinhMuc: true,
        }`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log("Patched API include successfully!");
} else {
  console.log("Regex did not match.");
}
