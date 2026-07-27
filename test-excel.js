const XLSX = require('xlsx');

// Mock a workbook with "Mã thay thế"
const ws = XLSX.utils.aoa_to_sheet([
  ["Tên hàng hoá *", "Mã sku", "Mã nhóm PM", "Mã thay thế"],
  ["Dây xịt inox", "DX304-15", "nsp-ykkp", "nsp-voi-01"],
  ["Something else", "17V", "nsp-voi", "nsp-voi-01"]
]);
const rows = XLSX.utils.sheet_to_json(ws);

const COL_MATHAYTHES= ["mã thay thế", "ma thay the", "mã thay thê", "mã thay the", "ma thay thế"];

function getVal(row, keys) {
  for (const key of Object.keys(row)) {
    const normalizedKey = key.toLowerCase().replace(/[\s\u200B-\u200D\uFEFF]/g, '');
    const normalizedKeys = keys.map(k => k.toLowerCase().replace(/[\s\u200B-\u200D\uFEFF]/g, ''));
    if (normalizedKeys.includes(normalizedKey) || normalizedKeys.some(nk => normalizedKey.includes(nk))) {
      return row[key];
    }
  }
  return undefined;
}

for (const row of rows) {
  console.log("Row:", row);
  console.log("maThayThe:", getVal(row, COL_MATHAYTHES));
}
