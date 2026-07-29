const fs = require('fs');

const file = 'prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf-8');

const anchor = 'category             InventoryCategory?    @relation(fields: [categoryId], references: [id])';
const insertion = `  erpCategoryId        String?
  erpCategory          Category?             @relation(fields: [erpCategoryId], references: [id])`;

if (content.includes(anchor) && !content.includes('erpCategoryId')) {
  content = content.replace(anchor, anchor + '\n' + insertion);
  fs.writeFileSync(file, content);
  console.log("Updated schema.prisma successfully!");
} else {
  console.log("Could not find anchor or already inserted.");
}
