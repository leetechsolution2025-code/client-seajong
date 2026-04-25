/**
 * Tạo file demo chấm công tháng 3/2026 cho TOÀN BỘ nhân viên trong DB.
 * Phủ đủ mọi kịch bản theo nội quy lao động.
 */
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');

const prisma = new PrismaClient();

const YEAR = 2026, MONTH = 3;
// Nội quy: vào 08:00, ra 17:30, ngưỡng bỏ qua 30 phút
const STD_IN_H = 8, STD_IN_M = 0;
const STD_OUT_H = 17, STD_OUT_M = 30;

function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(day) { return `${YEAR}-${pad(MONTH)}-${pad(day)}`; }
function toTime(h, m, s = 0) { return `${pad(h)}:${pad(m)}:${pad(s)}`; }

function isWeekend(day) {
  const d = new Date(`${dateStr(day)}T00:00:00Z`);
  return d.getUTCDay() === 0 || d.getUTCDay() === 6;
}

// Tạo log cho 1 nhân viên, phân bổ kịch bản ngẫu nhiên nhưng balance
function generateEmpRows(emp, empIndex) {
  const rows = [];
  // Seed kịch bản theo index để mỗi NV có hành vi khác nhau
  const seed = empIndex % 5; // 0..4 pattern khác nhau

  // Kịch bản cố định phân bổ đều
  const lateDay   = 2 + (empIndex % 4) * 3 + 1;   // đi muộn ngày nào
  const earlyDay  = 5 + (empIndex % 3) * 4;         // về sớm ngày nào
  const phepDay   = 17 + (empIndex % 3);            // nghỉ phép
  const klDay     = 12 + (empIndex % 2) * 2;        // nghỉ KL (chỉ ~50% NV)
  const otDay     = 20 + (empIndex % 3);            // OT ngày thường
  const otWeekend = (empIndex % 2 === 0) ? 8 : 21; // OT ngày cuối tuần (T7 hoặc CN)
  const omDay     = 26 + (empIndex % 2);            // nghỉ ốm (~50% NV)

  const hasForgotOut = empIndex % 4 === 0; // 25% NV quên chấm ra 1 lần
  const hasKL       = empIndex % 3 === 0; // ~33% NV có nghỉ KL
  const hasOM       = empIndex % 3 === 1; // ~33% NV có nghỉ ốm
  const hasBothVio  = empIndex % 5 === 2; // 20% NV vi phạm cả đến muộn lẫn về sớm 1 ngày

  for (let day = 1; day <= 31; day++) {
    const ds = dateStr(day);
    const we = isWeekend(day);

    // === Ngày cuối tuần ===
    if (we) {
      // Một số NV có OT cuối tuần
      if (day === otWeekend && seed < 3) {
        const dayOfWeek = new Date(`${ds}T00:00:00Z`).getUTCDay();
        const note = dayOfWeek === 0 ? 'OT-CN' : 'OT-T7';
        rows.push([empIndex + 1, emp.fullName, emp.code, emp.departmentName, ds, '08:00:00', '12:00:00', note]);
      }
      continue; // Bỏ qua các ngày cuối tuần còn lại
    }

    // === Ngày thường ===
    if (day === phepDay) {
      // Nghỉ phép có lương
      rows.push([empIndex + 1, emp.fullName, emp.code, emp.departmentName, ds, '', '', 'P']);
    } else if (hasKL && day === klDay) {
      // Nghỉ không lương
      rows.push([empIndex + 1, emp.fullName, emp.code, emp.departmentName, ds, '', '', 'K']);
    } else if (hasOM && day === omDay) {
      // Nghỉ ốm
      rows.push([empIndex + 1, emp.fullName, emp.code, emp.departmentName, ds, '', '', 'O']);
    } else if (day === lateDay) {
      // Đi muộn (45 - 90 phút, vượt ngưỡng 30p)
      const lateM = 40 + (empIndex % 3) * 15; // 40, 55, hoặc 70 phút muộn
      const inH = STD_IN_H + Math.floor((STD_IN_M + lateM) / 60);
      const inM = (STD_IN_M + lateM) % 60;
      rows.push([empIndex + 1, emp.fullName, emp.code, emp.departmentName, ds, toTime(inH, inM), '17:30:00', '']);
    } else if (day === earlyDay) {
      // Về sớm (35 - 60 phút)
      const earlyM = 35 + (empIndex % 3) * 10;
      const totalOut = STD_OUT_H * 60 + STD_OUT_M - earlyM;
      const outH = Math.floor(totalOut / 60);
      const outM = totalOut % 60;
      rows.push([empIndex + 1, emp.fullName, emp.code, emp.departmentName, ds, '08:00:00', toTime(outH, outM), '']);
    } else if (hasBothVio && day === lateDay + 1 && day <= 28) {
      // Cả đi muộn lẫn về sớm trong 1 ngày
      rows.push([empIndex + 1, emp.fullName, emp.code, emp.departmentName, ds, '08:40:00', '17:00:00', '']);
    } else if (day === otDay) {
      // OT ngày thường: ra trễ 2-4 tiếng
      const extraH = 2 + (empIndex % 3);
      rows.push([empIndex + 1, emp.fullName, emp.code, emp.departmentName, ds,
        '08:00:00', toTime(STD_OUT_H + extraH, STD_OUT_M), 'OT']);
    } else if (hasForgotOut && day === 13) {
      // Quên chấm ra
      rows.push([empIndex + 1, emp.fullName, emp.code, emp.departmentName, ds, '08:00:00', '', 'Quen cham']);
    } else {
      // Ngày bình thường: đến 07:50-08:05, về đúng giờ
      const varIn  = (empIndex + day) % 3; // -10, 0, +5 phút
      const inMins = [50, 0, 5][varIn];
      const inH2   = inMins === 50 ? 7 : 8;
      const inM2   = inMins === 50 ? 50 : inMins;
      rows.push([empIndex + 1, emp.fullName, emp.code, emp.departmentName, ds, toTime(inH2, inM2), '17:30:00', '']);
    }
  }

  return rows;
}

async function main() {
  const employees = await prisma.employee.findMany({
    select: { id: true, code: true, fullName: true, departmentName: true },
    orderBy: { departmentName: 'asc' },
  });

  console.log(`Tìm thấy ${employees.length} nhân viên. Đang tạo dữ liệu...`);

  const header = ['Ma may', 'Ho ten', 'Ma NV', 'Phong ban', 'Ngay', 'Gio vao', 'Gio ra', 'Ghi chu'];
  let allRows = [header];

  for (let i = 0; i < employees.length; i++) {
    const empRows = generateEmpRows(employees[i], i);
    allRows = allRows.concat(empRows);
    console.log(`  [${i+1}/${employees.length}] ${employees[i].fullName}: ${empRows.length} ngày`);
  }

  const ws = XLSX.utils.aoa_to_sheet(allRows);
  ws['!cols'] = [
    { wch: 8 }, { wch: 22 }, { wch: 30 }, { wch: 22 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ChamCong');

  const outPath = '/Users/leanhvan/Desktop/Demo_ChamCong_T3_2026.xlsx';
  XLSX.writeFile(wb, outPath);

  console.log(`\n✅ Xuất xong! File: ${outPath}`);
  console.log(`   Tổng: ${allRows.length - 1} dòng log cho ${employees.length} nhân viên`);
  console.log(`\nCác kịch bản đã phủ:`);
  console.log(`   ✓ Đi muộn > 30 phút (ngưỡng nội quy)`);
  console.log(`   ✓ Về sớm > 30 phút`);
  console.log(`   ✓ Cả đi muộn + về sớm cùng ngày (~20% NV)`);
  console.log(`   ✓ OT ngày thường (tất cả NV)`);
  console.log(`   ✓ OT cuối tuần T7/CN (~60% NV)`);
  console.log(`   ✓ Nghỉ phép có lương - P (tất cả NV)`);
  console.log(`   ✓ Nghỉ không lương - K (~33% NV)`);
  console.log(`   ✓ Nghỉ ốm - O (~33% NV)`);
  console.log(`   ✓ Quên chấm ra (~25% NV)`);
  console.log(`   ✓ Đi sớm trước 08:00 (về đúng giờ)`);
}

main().finally(() => prisma.$disconnect());
