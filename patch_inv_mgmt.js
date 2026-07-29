const fs = require('fs');
const file = 'src/components/finance/InventoryManagement.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace apiPath logic in fetchStats
content = content.replace(
  /let apiPath = "\/api\/logistics\/seajong-inventory\/stats";\n\s*if \(whType === "MATERIAL"\) apiPath = "\/api\/production\/materials\/stats";\n\s*else if \(whType === "PRODUCT"\) apiPath = "\/api\/production\/manufactured-products\/stats";\n\s*else if \(whType === "DEFECT"\) apiPath = "\/api\/logistics\/defects\/stats";\n\s*else if \(whType === "PRODUCT_SYNC"\) apiPath = "\/api\/finance\/inventory\/stats";/,
  'let apiPath = "/api/logistics/inventory"; // UNIFIED API endpoint'
);
content = content.replace(
  /const res = await fetch\(\`\$\{apiPath\}\?\$\{params\.toString\(\)\}\`\);\n\s*const data = await res\.json\(\);\n\s*setStats\(data\);/,
  'const res = await fetch(`${apiPath}?${params.toString()}`);\n      const data = await res.json();\n      setStats(data.stats || data);'
);

// Replace apiPath logic in fetchItems
content = content.replace(
  /let apiPath = "\/api\/logistics\/seajong-inventory";\n\s*if \(whType === "MATERIAL"\) apiPath = "\/api\/production\/materials";\n\s*else if \(whType === "PRODUCT"\) apiPath = "\/api\/production\/manufactured-products";\n\s*else if \(whType === "DEFECT"\) apiPath = "\/api\/logistics\/defects";\n\s*else if \(whType === "PRODUCT_SYNC"\) apiPath = "\/api\/finance\/inventory";/,
  'let apiPath = "/api/logistics/inventory"; // UNIFIED API endpoint'
);

// Replace apiPath logic in handleDelete
content = content.replace(
  /let apiPath = "\/api\/logistics\/seajong-inventory";\n\s*if \(whType === "MATERIAL"\) apiPath = "\/api\/production\/materials";\n\s*else if \(whType === "PRODUCT"\) apiPath = "\/api\/production\/manufactured-products";\n\s*else if \(whType === "DEFECT"\) apiPath = "\/api\/logistics\/defects";\n\s*else if \(whType === "PRODUCT_SYNC"\) apiPath = "\/api\/finance\/inventory";/,
  'let apiPath = "/api/logistics/inventory"; // UNIFIED API endpoint'
);
content = content.replace(
  /const res = await fetch\(\`\$\{apiPath\}\/\$\{deletingItem\.id\}\`, \{ method: "DELETE" \}\);/,
  'const res = await fetch(`${apiPath}?id=${deletingItem.id}&source=${deletingItem.source || "material"}`, { method: "DELETE" });'
);


fs.writeFileSync(file, content);
console.log("Patched InventoryManagement.tsx");
