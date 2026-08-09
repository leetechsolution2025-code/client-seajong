const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/app/api/plan-finance/stock-movements/**/*.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('prisma.inventoryItem.update({')) {
    // We need to replace the allStocks fetching and tongSoLuong logic
    // Usually it looks like:
    /*
      const allStocks = await prisma.inventoryStock.findMany({
        where: { inventoryItemId },
        include: { inventoryItem: { select: { soLuongMin: true } } },
      });
      const tongSoLuong = allStocks.reduce((s, st) => s + st.soLuong, 0);
    */
    
    // First, change the include to fetch warehouse code
    content = content.replace(
      /include:\s*\{\s*inventoryItem:\s*\{\s*select:\s*\{\s*soLuongMin:\s*true\s*(?:,\s*giaNhap:\s*true\s*)?\}\s*\}\s*\}/g,
      (match) => {
        if (match.includes('giaNhap')) {
          return 'include: { inventoryItem: { select: { soLuongMin: true, giaNhap: true } }, warehouse: { select: { code: true } } }';
        } else {
          return 'include: { inventoryItem: { select: { soLuongMin: true } }, warehouse: { select: { code: true } } }';
        }
      }
    );
    
    // Then replace the tongSoLuong calculation
    content = content.replace(
      /const tongSoLuong = allStocks\.reduce\(\(s, st\) => s \+ st\.soLuong, 0\);/g,
      "const validStocks = allStocks.filter((st: any) => st.warehouse?.code !== 'KHO-LOI');\n      const tongSoLuong = validStocks.reduce((s, st) => s + st.soLuong, 0);"
    );
    
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}
