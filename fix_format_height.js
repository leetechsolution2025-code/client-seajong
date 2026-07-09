const fs = require('fs');

let code = fs.readFileSync('src/components/sales/plan/OemPlanTab.tsx', 'utf8');

// Bỏ minHeight 250px của Mục tiêu doanh thu
code = code.replace(
  '                    <div className="d-flex flex-column gap-3 flex-grow-1" style={{ minHeight: "250px" }}>',
  '                    <div className="d-flex flex-column gap-3">'
);

// Bỏ minHeight 250px của Chiến lược hành động
code = code.replace(
  '                    <div className="d-flex flex-column flex-grow-1" style={{ minHeight: "250px" }}>',
  '                    <div className="d-flex flex-column flex-grow-1">'
);

// Cập nhật input Thanh lý hàng
code = code.replace(
  '<input type="text" className="form-control form-control-sm rounded-3 pe-4" placeholder="0" defaultValue="0" />',
  `<input type="text" className="form-control form-control-sm rounded-3 pe-4 text-end" placeholder="0" defaultValue="0" onChange={(e) => { const val = e.target.value.replace(/\\D/g, ""); e.target.value = val ? parseInt(val, 10).toLocaleString("en-US") : ""; }} />`
);

// Cập nhật input Bán hàng cho đại lý
code = code.replace(
  '<input type="text" className="form-control form-control-sm rounded-3 pe-4" placeholder="0" defaultValue="0" />',
  `<input type="text" className="form-control form-control-sm rounded-3 pe-4 text-end" placeholder="0" defaultValue="0" onChange={(e) => { const val = e.target.value.replace(/\\D/g, ""); e.target.value = val ? parseInt(val, 10).toLocaleString("en-US") : ""; }} />`
);

// Cập nhật input Bán lẻ
code = code.replace(
  '<input type="text" className="form-control form-control-sm rounded-3 pe-4" placeholder="0" defaultValue="0" />',
  `<input type="text" className="form-control form-control-sm rounded-3 pe-4 text-end" placeholder="0" defaultValue="0" onChange={(e) => { const val = e.target.value.replace(/\\D/g, ""); e.target.value = val ? parseInt(val, 10).toLocaleString("en-US") : ""; }} />`
);

fs.writeFileSync('src/components/sales/plan/OemPlanTab.tsx', code);
console.log("Updated input formats and removed minHeight successfully");
