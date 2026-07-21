import * as xlsx from 'xlsx';

try {
  const workbook = xlsx.readFile('doc/data/dinhmuc.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  console.log("Total rows:", data.length);
  console.log("First 5 rows:");
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
} catch (e) {
  console.error(e);
}
