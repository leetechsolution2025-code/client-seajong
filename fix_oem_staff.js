const fs = require('fs');

let code = fs.readFileSync('src/components/sales/plan/OemPlanTab.tsx', 'utf8');

// 1. Remove DEFAULT_STAFF_ROWS definition
const staffRowsRegex = /const DEFAULT_STAFF_ROWS: StaffItemRow\[\] = \[\s*([\s\S]*?)\];/;
const staffRowsMatch = code.match(staffRowsRegex);
if (staffRowsMatch) {
  code = code.replace(staffRowsMatch[0], 'const DEFAULT_STAFF_ROWS: StaffItemRow[] = [];');
}

// 2. Replace the mappedStaffRows generation in mapMasterDataToStates
const mappedStaffRegex = /const mappedStaffRows = DEFAULT_STAFF_ROWS\.map\(\(row: StaffItemRow\) => \{[\s\S]*?return cleanRow;\s*\}\);/;
const mappedStaffReplacement = `let staffCounter = 1;
    const mappedStaffRows: StaffItemRow[] = [];
    
    const pushCategory = (title: string, staffList: any[]) => {
      if (!staffList || staffList.length === 0) return;
      mappedStaffRows.push({ isFullWidth: true, fullWidthContent: title });
      staffList.forEach((item: any) => {
        const qty = Number(item.qty) || 0;
        const basicSalary = Number(item.salary) || 0;
        mappedStaffRows.push({
          stt: String(staffCounter++),
          role: item.label || "",
          basicSalary,
          performanceSalary: 0,
          allowance: 0,
          quantity: qty,
          totalBudget: basicSalary * qty * 12
        });
      });
    };

    pushCategory("A. PHÒNG KINH DOANH", parsed.bizStaff);
    pushCategory("B. KHỐI SẢN XUẤT", parsed.mktStaff);
    pushCategory("C. KẾ TOÁN VÀ NHÂN SỰ", parsed.finStaff);
    pushCategory("D. KHO VẬN", parsed.logStaff);`;

if (code.match(mappedStaffRegex)) {
  code = code.replace(mappedStaffRegex, mappedStaffReplacement);
} else {
  console.log("Could not find mappedStaffRows block");
}

fs.writeFileSync('src/components/sales/plan/OemPlanTab.tsx', code);
console.log("Done updating staff mapping in OemPlanTab");
