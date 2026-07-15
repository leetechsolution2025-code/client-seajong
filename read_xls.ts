import * as xlsx from 'xlsx';

try {
  const workbook = xlsx.readFile('./public/uploads/tailieu/Báo cáo tài chính_Tháng 1 năm 2026..xls');
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    // Print first 50 rows
    for (const row of json.slice(0, 50)) {
        if (Array.isArray(row) && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
            console.log(row.map(c => c === undefined ? '' : String(c).substring(0, 50)).join(' | '));
        }
    }
  }
} catch (e) {
  console.error("Error reading file:", e);
}
