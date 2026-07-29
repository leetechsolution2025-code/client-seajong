const fs = require('fs');
const file = 'prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf8');

// 1. In InventoryItem, replace:
//   dinhMucId            String?
//   dinhMuc              DinhMuc?              @relation(fields: [dinhMucId], references: [id])
// With:
//   dinhMucs             DinhMuc[]

content = content.replace(/dinhMucId\s+String\?\n\s*dinhMuc\s+DinhMuc\?\s+@relation\(fields:\s*\[dinhMucId\],\s*references:\s*\[id\]\)/, 'dinhMucs             DinhMuc[]');

// Also remove @@index([dinhMucId]) from InventoryItem
content = content.replace(/@@index\(\[dinhMucId\]\)\n/, '');

// 2. In DinhMuc, replace:
//   items      InventoryItem[]
// With:
//   inventoryItemId String?
//   inventoryItem   InventoryItem? @relation(fields: [inventoryItemId], references: [id])
//   @@index([inventoryItemId])

content = content.replace(/items\s+InventoryItem\[\]/, 'inventoryItemId String?\n  inventoryItem   InventoryItem? @relation(fields: [inventoryItemId], references: [id])');

// Add the index to DinhMuc if not present
if (!content.includes('@@index([inventoryItemId])') && content.includes('@@index([code])')) {
    content = content.replace(/@@index\(\[code\]\)/, '@@index([code])\n  @@index([inventoryItemId])');
}

fs.writeFileSync(file, content);
console.log("Schema updated!");
