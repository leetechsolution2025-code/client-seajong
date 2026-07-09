const fs = require('fs');

let code = fs.readFileSync('src/components/sales/plan/OemPlanTab.tsx', 'utf8');

const targetStr = `{/* TOOLBAR */}`;
const endStr = `{/* SPLIT LAYOUT 5-7 */}`;
const startIndex = code.indexOf(targetStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `{/* TOOLBAR (Nút lưu) */}
              <div className="d-flex align-items-center mb-2 pb-2 pt-2 border-bottom border-light-subtle sticky-top bg-white" style={{ zIndex: 10, top: "-1rem" }}>
                <div className="ms-auto d-flex gap-2">
                  <button className="btn btn-sm btn-indigo rounded-3 fw-medium d-flex align-items-center justify-content-center p-0 shadow-sm hover-scale" style={{ width: "36px", height: "36px" }} title="Lưu kế hoạch">
                    <i className="bi bi-floppy fs-5"></i>
                  </button>
                </div>
              </div>

              {/* TIMELINE THÁNG */}
              <div className="d-flex justify-content-end mb-4">
                <div className="position-relative d-flex align-items-center" style={{ width: "380px", maxWidth: "100%", height: "28px" }}>
                  <div
                    className="position-absolute"
                    style={{ height: "2px", left: "14px", right: "14px", zIndex: 1, backgroundColor: "#e2e8f0", borderRadius: "1px" }}
                  />
                  <div className="position-relative w-100 d-flex justify-content-between align-items-center" style={{ zIndex: 2 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <button
                        key={m}
                        className={\`rounded-circle d-flex align-items-center justify-content-center transition shadow-sm p-0 \${selectedMonth === m ? 'text-white' : 'bg-white text-secondary'}\`}
                        style={{
                          width: "28px", height: "28px", fontSize: "12px", fontWeight: 700,
                          backgroundColor: selectedMonth === m ? '#6366f1' : '#ffffff',
                          border: \`2px solid \${selectedMonth === m ? '#6366f1' : '#e2e8f0'}\`,
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
              </div>

              `;
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('src/components/sales/plan/OemPlanTab.tsx', code);
  console.log("Updated toolbar and timeline successfully");
} else {
  console.log("Blocks not found");
}
