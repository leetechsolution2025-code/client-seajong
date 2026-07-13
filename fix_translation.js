const fs = require('fs');
let code = fs.readFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', 'utf8');

code = code.replace(/"HỘP": "盒",\n  "THÙNG": "箱",/g, 
  `"HỘP": "盒",
  "THÙNG": "箱",
  "Xe tải": "卡车",
  "Giao hàng tận nơi": "送货上门",
  "Chuyển khoản": "银行转账",`);

fs.writeFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', code);
