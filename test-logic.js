const XLSX = require('xlsx');
const wb = XLSX.readFile('doc/data/dinhmuc_da_xoa_trung.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(ws, {header: 1});

let startIndex = 0;
let colPCode = 0;
let colMCode = 1;
let colUnit = 2;
let colQty = 3;

for (let i = 0; i < rawData.length; i++) {
  const row = rawData[i];
  const rowStr = row.map(c => String(c || "").toLowerCase().trim());
  
  const pCodeIdx = rowStr.findIndex(c => c === "mã" || c === "mã sản phẩm" || c === "mã đm" || c === "mã định mức");
  if (pCodeIdx !== -1) {
    startIndex = i + 1;
    colPCode = pCodeIdx;
    console.log("Found pCodeIdx at", i, "col", pCodeIdx);
    console.log("rowStr", rowStr);
    
    const mCodeIdx = rowStr.findIndex(c => (c.includes("mã") && c.includes("vật tư")) || (c.includes("mã") && c.includes("nguyên vật liệu")) || c === "mã nvl" || c === "mã vt");
    if (mCodeIdx !== -1) colMCode = mCodeIdx;
    console.log("Found mCodeIdx at", mCodeIdx);
    
    break;
  }
}
