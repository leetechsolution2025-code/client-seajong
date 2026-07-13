const fs = require('fs');
let code = fs.readFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', 'utf8');

// Reduce main line height
code = code.replace(/lineHeight: 1\.45/g, "lineHeight: 1.25");

// Reduce note line height
code = code.replace(/lineHeight: 1\.7/g, "lineHeight: 1.35");

// Reduce some padding
code = code.replace(/padding: "8px 6px"/g, 'padding: "4px 6px"');
code = code.replace(/padding: "6px 14px"/g, 'padding: "4px 10px"');

fs.writeFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', code);
