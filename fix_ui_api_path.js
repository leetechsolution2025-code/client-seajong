const fs = require('fs');

const file = 'src/components/finance/InventoryManagement.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace stats logic
const statsRegex = /let apiPath = "\/api\/logistics\/seajong-inventory\/stats";\s*if \(whType === "MATERIAL"\) apiPath = "\/api\/production\/materials\/stats";\s*else if \(whType === "PRODUCT"\) apiPath = "\/api\/production\/manufactured-products\/stats";\s*else if \(whType === "DEFECT"\) apiPath = "\/api\/logistics\/defects\/stats";\s*else if \(whType === "PRODUCT_SYNC"\) apiPath = "\/api\/finance\/inventory\/stats";/g;

content = content.replace(statsRegex, `let apiPath = "/api/logistics/inventory/stats";`);

// Replace list logic
const listRegex = /let apiPath = "\/api\/logistics\/seajong-inventory";\s*if \(whType === "MATERIAL"\) apiPath = "\/api\/production\/materials";\s*else if \(whType === "PRODUCT"\) apiPath = "\/api\/production\/manufactured-products";\s*else if \(whType === "DEFECT"\) apiPath = "\/api\/logistics\/defects";\s*else if \(whType === "PRODUCT_SYNC"\) apiPath = "\/api\/finance\/inventory";/g;

content = content.replace(listRegex, `let apiPath = "/api/logistics/inventory";`);

fs.writeFileSync(file, content);
console.log("Fixed InventoryManagement api paths!");
