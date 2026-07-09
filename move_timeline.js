const fs = require('fs');

let code = fs.readFileSync('src/components/sales/plan/OemPlanTab.tsx', 'utf8');

const targetStartStr = `{/* TOOLBAR (Nút lưu) */}`;
const endStr = `{/* SPLIT LAYOUT 5-7 */}`;
const startIndex = code.indexOf(targetStartStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `{/* TOOLBAR (Nút lưu & Timeline) */}
              <div className="d-flex align-items-center py-2 px-4 sticky-top bg-light border-bottom border-light-subtle" style={{ zIndex: 10, top: 0, margin: "-1.5rem -1.5rem 1.5rem -1.5rem" }}>
                
                {/* TIMELINE THÁNG */}
                <div className="position-relative d-flex align-items-center" style={{ width: "380px", maxWidth: "100%", height: "28px" }}>
                  <div
                    className="position-absolute"
                    style={{ height: "2px", left: "14px", right: "14px", zIndex: 1, backgroundColor: "#cbd5e1", borderRadius: "1px" }}
                  />
                  <div className="position-relative w-100 d-flex justify-content-between align-items-center" style={{ zIndex: 2 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <button
                        key={m}
                        className={\`rounded-circle d-flex align-items-center justify-content-center transition shadow-sm p-0 \${selectedMonth === m ? 'text-white' : 'bg-white text-secondary'}\`}
                        style={{
                          width: "28px", height: "28px", fontSize: "12px", fontWeight: 700,
                          backgroundColor: selectedMonth === m ? '#6366f1' : '#ffffff',
                          border: \`2px solid \${selectedMonth === m ? '#6366f1' : '#cbd5e1'}\`,
                          cursor: "pointer", zIndex: 2
                        }}
                        onClick={() => setSelectedMonth(m)}
                        title={\`Tháng \${m}\`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ms-auto d-flex gap-2">
                  <button className="btn btn-sm btn-indigo rounded-3 fw-medium d-flex align-items-center justify-content-center p-0 shadow-sm hover-scale" style={{ width: "36px", height: "36px" }} title="Lưu kế hoạch">
                    <i className="bi bi-floppy fs-5"></i>
                  </button>
                </div>
              </div>

              `;
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('src/components/sales/plan/OemPlanTab.tsx', code);
  console.log("Moved timeline inside toolbar successfully");
} else {
  console.log("Blocks not found");
}
