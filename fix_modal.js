const fs = require('fs');
let code = fs.readFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', 'utf8');

code = code.replace(/\{\/\* Signatures \*\/\}\n          \{ role: t\.giamDoc/g, 
  `{/* Signatures */}
      <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", paddingBottom: 24 }}>
        {[
          { role: t.nguoiLapPhieu, note: t.kyGhiRoHoTen },
          { role: t.keToanTruong, note: t.kyGhiRoHoTen },
          { role: t.giamDoc`);

fs.writeFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', code);
