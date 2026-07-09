const fs = require('fs');

let code = fs.readFileSync('src/components/sales/plan/OemPlanTab.tsx', 'utf8');

const oldBlockStart = '{currentStep === 2 && (';
const oldBlockSearch = 'Nội dung đang được thiết kế lại';
const oldBlockEndStr = '{/* STEP 3: DỮ LIỆU */}';

const startIndex = code.indexOf(oldBlockStart);
const endIndex = code.indexOf(oldBlockEndStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newBlock = `{currentStep === 2 && (
            <div className="d-flex flex-column h-100">
              {/* TOOLBAR */}
              <div className="d-flex align-items-center mb-4 pb-3 border-bottom border-light-subtle" style={{ overflowX: "auto" }}>
                <div className="d-flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <button
                      key={m}
                      className={\`btn btn-sm rounded-pill fw-medium \${selectedMonth === m ? 'btn-indigo shadow-sm' : 'btn-light border-0 text-secondary hover-bg-light-indigo'}\`}
                      style={{ width: "42px", height: "42px", transition: "all 0.2s" }}
                      onClick={() => setSelectedMonth(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="ms-auto d-flex gap-2">
                  <button className="btn btn-sm btn-outline-indigo rounded-3 fw-medium d-flex align-items-center gap-1.5 px-3">
                    <i className="bi bi-file-earmark-pdf"></i> Xuất PDF
                  </button>
                  <button className="btn btn-sm btn-indigo rounded-3 fw-medium d-flex align-items-center gap-1.5 px-3">
                    <i className="bi bi-floppy"></i> Lưu kế hoạch
                  </button>
                </div>
              </div>

              {/* SPLIT LAYOUT 5-7 */}
              <div className="row g-4 flex-grow-1">
                {/* CỘT TRÁI (Tỷ lệ 5) */}
                <div className="col-12 col-xl-5 d-flex flex-column gap-4">
                  
                  {/* MỤC TIÊU THÁNG */}
                  <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden" style={{ minHeight: "250px" }}>
                    <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex align-items-center gap-2">
                      <div className="rounded-circle bg-indigo bg-opacity-10 text-indigo d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                        <i className="bi bi-bullseye fs-5"></i>
                      </div>
                      <h6 className="mb-0 fw-bold text-dark">Mục tiêu tháng {selectedMonth}</h6>
                    </div>
                    <div className="card-body px-4 pb-4 pt-2">
                      <div className="d-flex flex-column gap-3 h-100">
                        {/* Placeholder input */}
                        <div className="d-flex flex-column gap-1">
                          <label className="text-secondary fw-medium" style={{ fontSize: 12.5 }}>Doanh thu dự kiến</label>
                          <div className="input-group input-group-sm">
                            <input type="text" className="form-control rounded-3" placeholder="Nhập doanh thu..." defaultValue="0" />
                            <span className="input-group-text bg-white border-0 text-secondary">VNĐ</span>
                          </div>
                        </div>
                        <div className="d-flex flex-column gap-1">
                          <label className="text-secondary fw-medium" style={{ fontSize: 12.5 }}>Đại lý phát triển mới</label>
                          <div className="input-group input-group-sm">
                            <input type="text" className="form-control rounded-3" placeholder="Số lượng đại lý..." defaultValue="0" />
                            <span className="input-group-text bg-white border-0 text-secondary">Đại lý</span>
                          </div>
                        </div>
                        <div className="d-flex flex-column gap-1">
                          <label className="text-secondary fw-medium" style={{ fontSize: 12.5 }}>Ghi chú / Mục tiêu khác</label>
                          <textarea className="form-control rounded-3" rows={3} placeholder="Nhập mục tiêu khác..."></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CHIẾN LƯỢC HÀNH ĐỘNG */}
                  <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden" style={{ minHeight: "250px" }}>
                    <div className="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex align-items-center gap-2">
                      <div className="rounded-circle text-warning d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, backgroundColor: "rgba(245, 158, 11, 0.15)" }}>
                        <i className="bi bi-lightbulb-fill fs-5"></i>
                      </div>
                      <h6 className="mb-0 fw-bold text-dark">Chiến lược hành động</h6>
                    </div>
                    <div className="card-body px-4 pb-4 pt-2">
                      <textarea className="form-control rounded-3 w-100 h-100" style={{ minHeight: "150px", resize: "none" }} placeholder="Nhập chiến lược hành động chi tiết..."></textarea>
                    </div>
                  </div>

                </div>

                {/* CỘT PHẢI (Tỷ lệ 7) */}
                <div className="col-12 col-xl-7 d-flex flex-column">
                  
                  {/* CÁC CÔNG VIỆC CẦN THỰC HIỆN NGAY */}
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
                    <div className="card-body px-4 pb-4 pt-2 d-flex flex-column">
                      
                      <div className="table-responsive flex-grow-1 custom-scrollbar">
                        <table className="table table-hover align-middle mb-0">
                          <thead>
                            <tr style={{ fontSize: "11px", color: "#6b7280" }} className="text-uppercase fw-bold">
                              <th className="border-0 pb-3" style={{ width: 40 }}>STT</th>
                              <th className="border-0 pb-3">Tên công việc</th>
                              <th className="border-0 pb-3">Người phụ trách</th>
                              <th className="border-0 pb-3">Deadline</th>
                              <th className="border-0 pb-3 text-center">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[1, 2, 3, 4, 5].map((item) => (
                              <tr key={item} style={{ fontSize: "13px" }}>
                                <td className="text-secondary fw-medium py-3">{item}</td>
                                <td className="py-3">
                                  <input type="text" className="form-control form-control-sm border-0 bg-light rounded-3" placeholder="Nhập tên công việc..." />
                                </td>
                                <td className="py-3">
                                  <input type="text" className="form-control form-control-sm border-0 bg-light rounded-3" placeholder="Người phụ trách..." />
                                </td>
                                <td className="py-3">
                                  <input type="date" className="form-control form-control-sm border-0 bg-light rounded-3 text-secondary" />
                                </td>
                                <td className="py-3 text-center">
                                  <select className="form-select form-select-sm border-0 bg-light rounded-pill" style={{ width: 120 }}>
                                    <option value="pending">Chưa làm</option>
                                    <option value="doing">Đang làm</option>
                                    <option value="done">Hoàn thành</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          `;
  
  code = code.substring(0, startIndex) + newBlock + code.substring(endIndex);
  fs.writeFileSync('src/components/sales/plan/OemPlanTab.tsx', code);
  console.log("Successfully inserted detailed step 2 UI");
} else {
  console.log("Could not find blocks");
}
