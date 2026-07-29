const XLSX = require('xlsx');
const workbook = XLSX.readFile('danh_sach_vat_tu_thieu.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
for(let i=1; i<5; i++) {
  console.log(rows[i]);
}
