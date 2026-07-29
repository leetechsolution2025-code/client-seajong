const fs = require('fs');

const file = 'src/app/api/production/bom/route.ts';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace old material category inclusion with erpCategory
  const regex = /material:\s*\{\s*include:\s*\{\s*category: true\s*\}\s*\}/g;
  const replacement = `material: { include: { category: true, erpCategory: true } }`;
  
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log("Patched BOM API include successfully!");
  } else {
    console.log("Regex did not match BOM API. Maybe it's different?");
  }
}
