import fs from 'fs';

let schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');

// Remove references from Category
schema = schema.replace(/materials\s+MaterialItem\[\]/g, '');
schema = schema.replace(/manufacturedProducts\s+ManufacturedProduct\[\]\s+@relation\("MfpProdCategory"\)/g, '');

// Remove references from InventoryCategory
schema = schema.replace(/manufacturedProducts\s+ManufacturedProduct\[\]\s+@relation\("MfpCategory"\)/g, '');

// Remove references from Warehouse
schema = schema.replace(/materialStocks\s+MaterialStock\[\]/g, '');

// Remove indexes from DinhMuc
schema = schema.replace(/@@index\(\[manufacturedProductId\]\)/g, '');
schema = schema.replace(/@@index\(\[materialItemId\]\)/g, '');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Patched schema for step 3');
