const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const catMatch = schema.match(/model Category \{[\s\S]*?\}/g);
const invCatMatch = schema.match(/model InventoryCategory \{[\s\S]*?\}/g);
console.log(catMatch ? catMatch[0] : 'no Category');
console.log('---');
console.log(invCatMatch ? invCatMatch[0] : 'no InventoryCategory');
