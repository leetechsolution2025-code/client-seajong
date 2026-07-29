const fs = require('fs');
const file = 'prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf8');

// The replacement in InventoryCategory was:
// inventoryItemId String?
// inventoryItem   InventoryItem? @relation(fields: [inventoryItemId], references: [id])
// 
// I need to change it back to items InventoryItem[] inside InventoryCategory ONLY.

content = content.replace(
\`model InventoryCategory {
  id                   String               @id @default(cuid())
  code                 String?              @unique
  tenHang              String
  type                 String?              @default("KVP")
  parentId             String?
  parent               InventoryCategory?   @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children             InventoryCategory[]  @relation("CategoryHierarchy")
  inventoryItemId String?
  inventoryItem   InventoryItem? @relation(fields: [inventoryItemId], references: [id])\`,
\`model InventoryCategory {
  id                   String               @id @default(cuid())
  code                 String?              @unique
  tenHang              String
  type                 String?              @default("KVP")
  parentId             String?
  parent               InventoryCategory?   @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children             InventoryCategory[]  @relation("CategoryHierarchy")
  items                InventoryItem[]\`
);

// Also remove @@index([inventoryItemId]) from InventoryCategory
content = content.replace(
\`  @@index([parentId])
  @@index([type])
  @@index([inventoryItemId])
}\`,
\`  @@index([parentId])
  @@index([type])
}\`
);

fs.writeFileSync(file, content);
console.log("Fixed InventoryCategory!");
