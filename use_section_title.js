const fs = require('fs');

let code = fs.readFileSync('src/components/sales/plan/OemPlanTab.tsx', 'utf8');

// Giảm lề trên (giảm margin-bottom của toolbar)
code = code.replace(
  'margin: "-1.5rem -1.5rem 1.5rem -1.5rem"',
  'margin: "-1.5rem -1.5rem 1rem -1.5rem"'
);

// MỤC TIÊU THÁNG
const oldMucTieu = `{/* MỤC TIÊU THÁNG */}
                  <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden" style={{ minHeight: "250px" }}>
                    <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex align-items-center gap-2">
                      <div className="rounded-circle bg-indigo bg-opacity-10 text-indigo d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                        <i className="bi bi-bullseye fs-5"></i>
                      </div>
                      <h6 className="mb-0 fw-bold text-dark">Mục tiêu tháng {selectedMonth}</h6>
                    </div>
                    <div className="card-body px-4 pb-4 pt-2">`;

const newMucTieu = `{/* MỤC TIÊU THÁNG */}
                  <div className="d-flex flex-column gap-2 flex-grow-1">
                    <SectionTitle title={\`Mục tiêu tháng \${selectedMonth}\`} className="mb-0 ps-1" />
                    <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden" style={{ minHeight: "250px" }}>
                      <div className="card-body p-4">`;
code = code.replace(oldMucTieu, newMucTieu);

// Đóng thẻ div cho MỤC TIÊU THÁNG
const oldDongMucTieu = `                      </div>
                    </div>
                  </div>

                  {/* CHIẾN LƯỢC HÀNH ĐỘNG */}`;
const newDongMucTieu = `                      </div>
                    </div>
                  </div>

                  {/* CHIẾN LƯỢC HÀNH ĐỘNG */}`;
// Wait, the nesting level increased by 1 because I added <div className="d-flex flex-column gap-2 flex-grow-1">
code = code.replace(
`                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CHIẾN LƯỢC HÀNH ĐỘNG */}`,
`                        </div>
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* CHIẾN LƯỢC HÀNH ĐỘNG */}`
);

// CHIẾN LƯỢC HÀNH ĐỘNG
const oldChienLuoc = `{/* CHIẾN LƯỢC HÀNH ĐỘNG */}
                  <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden" style={{ minHeight: "250px" }}>
                    <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex align-items-center gap-2">
                      <div className="rounded-circle text-warning d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, backgroundColor: "rgba(245, 158, 11, 0.15)" }}>
                        <i className="bi bi-lightbulb-fill fs-5"></i>
                      </div>
                      <h6 className="mb-0 fw-bold text-dark">Chiến lược hành động</h6>
                    </div>
                    <div className="card-body px-4 pb-4 pt-2">`;

const newChienLuoc = `{/* CHIẾN LƯỢC HÀNH ĐỘNG */}
                  <div className="d-flex flex-column gap-2 flex-grow-1">
                    <SectionTitle title="Chiến lược hành động" className="mb-0 ps-1" />
                    <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden" style={{ minHeight: "250px" }}>
                      <div className="card-body p-4">`;
code = code.replace(oldChienLuoc, newChienLuoc);

// Đóng thẻ div cho CHIẾN LƯỢC HÀNH ĐỘNG
code = code.replace(
`                      <textarea className="form-control rounded-3 w-100 h-100" style={{ minHeight: "150px", resize: "none" }} placeholder="Nhập chiến lược hành động chi tiết..."></textarea>
                    </div>
                  </div>

                </div>

                {/* CỘT PHẢI (Tỷ lệ 7) */}`,
`                      <textarea className="form-control rounded-3 w-100 h-100" style={{ minHeight: "150px", resize: "none" }} placeholder="Nhập chiến lược hành động chi tiết..."></textarea>
                    </div>
                  </div>
                  </div>

                </div>

                {/* CỘT PHẢI (Tỷ lệ 7) */}`
);


// CÁC CÔNG VIỆC CẦN THỰC HIỆN NGAY
const oldCongViec = `{/* CÁC CÔNG VIỆC CẦN THỰC HIỆN NGAY */}
                  <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden d-flex flex-column" style={{ minHeight: "520px" }}>
                    <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex align-items-center gap-2 justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-circle text-danger d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, backgroundColor: "rgba(239, 68, 68, 0.15)" }}>
                          <i className="bi bi-lightning-charge-fill fs-5"></i>
                        </div>
                        <h6 className="mb-0 fw-bold text-dark">Các công việc cần thực hiện ngay</h6>
                      </div>
                      <button className="btn btn-sm btn-light text-indigo fw-medium rounded-pill px-3 d-flex align-items-center gap-1 hover-bg-light-indigo transition-all">
                        <i className="bi bi-plus-lg"></i> Thêm việc
                      </button>
                    </div>
                    <div className="card-body px-4 pb-4 pt-2 d-flex flex-column">`;

const newCongViec = `{/* CÁC CÔNG VIỆC CẦN THỰC HIỆN NGAY */}
                  <div className="d-flex flex-column gap-2 flex-grow-1 h-100">
                    <SectionTitle 
                      title="Các công việc cần thực hiện ngay" 
                      className="mb-0 ps-1"
                      action={
                        <button className="btn btn-sm btn-light text-indigo fw-medium rounded-pill px-3 d-flex align-items-center gap-1 hover-bg-light-indigo transition-all">
                          <i className="bi bi-plus-lg"></i> Thêm việc
                        </button>
                      }
                    />
                    <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden d-flex flex-column" style={{ minHeight: "520px" }}>
                      <div className="card-body p-4 d-flex flex-column">`;
code = code.replace(oldCongViec, newCongViec);

// Đóng thẻ div cho CÁC CÔNG VIỆC
code = code.replace(
`                        </table>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}`,
`                        </table>
                      </div>

                    </div>
                  </div>
                  </div>

                </div>
              </div>
            </div>
          )}`
);

fs.writeFileSync('src/components/sales/plan/OemPlanTab.tsx', code);
console.log("Updated SectionTitles and reduced margin successfully");
