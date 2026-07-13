const fs = require('fs');
let code = fs.readFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', 'utf8');

code = code.replace(/const bodyCell = printStyles\.bodyCell;/g, 
  "const bodyCell = { ...printStyles.bodyCell, padding: '5px 8px' };");
  
code = code.replace(/const secHead = printStyles\.secHead;/g, 
  "const secHead = { ...printStyles.secHead, padding: '5px 8px' };");

fs.writeFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', code);
