import fs from 'fs';

let schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');

// Add inventoryItemId to DinhMucVatTu
if (!schema.includes('inventoryItemId String?')) {
  schema = schema.replace(
    /material\s+MaterialItem\?\s+@relation\(fields:\s*\[materialId\],\s*references:\s*\[id\]\)/,
    `material   MaterialItem? @relation(fields: [materialId], references: [id])\n  inventoryItemId String?\n  inventoryItem   InventoryItem? @relation(fields: [inventoryItemId], references: [id])`
  );
  fs.writeFileSync('prisma/schema.prisma', schema);
  console.log('Patched schema for step 1');
} else {
  console.log('Already patched');
}
