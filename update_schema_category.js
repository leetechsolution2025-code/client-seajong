const fs = require('fs');

const file = 'prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf-8');

const anchor = 'dinhMucVatTus        DinhMucVatTu[]';
const insertion = `  inventoryItems       InventoryItem[]`;

if (content.includes(anchor) && !content.includes('inventoryItems')) {
  content = content.replace(anchor, anchor + '\n' + insertion);
  fs.writeFileSync(file, content);
  console.log("Updated Category in schema.prisma successfully!");
} else {
  console.log("Could not find anchor or already inserted.");
}
