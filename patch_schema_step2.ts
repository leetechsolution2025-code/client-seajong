import fs from 'fs';

let schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');

// 1. Remove ManufacturedProduct table and its references in DinhMuc
schema = schema.replace(/model ManufacturedProduct \{[\s\S]*?\n\}/g, '');
schema = schema.replace(/manufacturedProductId String\?/g, '');
schema = schema.replace(/manufacturedProduct\s+ManufacturedProduct\?\s+@relation\(fields:\s*\[manufacturedProductId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/g, '');

// 2. Remove MaterialItem table and its references in DinhMuc and DinhMucVatTu
schema = schema.replace(/model MaterialItem \{[\s\S]*?\n\}/g, '');
schema = schema.replace(/materialItemId String\?/g, '');
schema = schema.replace(/materialItem\s+MaterialItem\?\s+@relation\(fields:\s*\[materialItemId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/g, '');
schema = schema.replace(/materialId\s+String\?/g, '');
schema = schema.replace(/material\s+MaterialItem\?\s+@relation\(fields:\s*\[materialId\],\s*references:\s*\[id\]\)/g, '');

// 3. Remove MaterialStock table
schema = schema.replace(/model MaterialStock \{[\s\S]*?\n\}/g, '');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Patched schema for step 2');
