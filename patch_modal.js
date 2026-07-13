const fs = require('fs');
let code = fs.readFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', 'utf8');

code = code.replace(/exportElementToPDF\("po-document", `DonDatHang_\$\{poDraft\}\.pdf`, {/g, 
  `exportElementToPDF("po-document", \`DonDatHang_\${poDraft}.pdf\`, {
      keepOriginalStyles: true,`);

fs.writeFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', code);
