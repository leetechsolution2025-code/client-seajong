const fs = require('fs');
let code = fs.readFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', 'utf8');

// Fix Header layout
code = code.replace(
  /<div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, marginRight: 24 }}>/g,
  '<div style={{ display: "flex", alignItems: "flex-start", width: "calc(100% - 294px)" }}>'
);
code = code.replace(
  /flexShrink: 0 }}/g,
  'flexShrink: 0, marginRight: 12 }}'
);
// Fix Notes + Totals layout
code = code.replace(
  /<div style={{ display: "flex", gap: 32, alignItems: "flex-start", marginBottom: 28 }}>/g,
  '<div style={{ display: "flex", alignItems: "flex-start", marginBottom: 28 }}>'
);
code = code.replace(
  /<div style={{ flex: 1, fontSize: 11\.5, lineHeight: 1\.7 }}>/g,
  '<div style={{ width: "calc(100% - 272px)", fontSize: 11.5, lineHeight: 1.7, marginRight: 32 }}>'
);

fs.writeFileSync('src/components/plan-finance/mua_hang/XemTruocDonMuaHangModal.tsx', code);
