const fs = require('fs');

let code = fs.readFileSync('src/components/sales/plan/OemPlanTab.tsx', 'utf8');

// --- 1. MỤC TIÊU DOANH THU ---
const oldMucTieu = `                    <SectionTitle title="Mục tiêu doanh thu" className="mb-0 ps-1" />
                    <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden" style={{ minHeight: "250px" }}>
                      <div className="card-body p-4">`;
const newMucTieu = `                    <SectionTitle title="Mục tiêu doanh thu" className="mb-0 ps-1" />
                    <div className="d-flex flex-column gap-3 flex-grow-1" style={{ minHeight: "250px" }}>`;
code = code.replace(oldMucTieu, newMucTieu);

// Remove the two closing divs for MỤC TIÊU
code = code.replace(
`                        </div>
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* CHIẾN LƯỢC HÀNH ĐỘNG */}`,
`                        </div>
                      </div>
                  </div>

                  {/* CHIẾN LƯỢC HÀNH ĐỘNG */}`
);

// --- 2. CHIẾN LƯỢC HÀNH ĐỘNG ---
const oldChienLuoc = `                    <SectionTitle title="Chiến lược hành động" className="mb-0 ps-1" />
                    <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden" style={{ minHeight: "250px" }}>
                      <div className="card-body p-4">`;
const newChienLuoc = `                    <SectionTitle title="Chiến lược hành động" className="mb-0 ps-1" />
                    <div className="d-flex flex-column flex-grow-1" style={{ minHeight: "250px" }}>`;
code = code.replace(oldChienLuoc, newChienLuoc);

// Remove the two closing divs for CHIẾN LƯỢC
code = code.replace(
`                      <textarea className="form-control rounded-3 w-100 h-100" style={{ minHeight: "150px", resize: "none" }} placeholder="Nhập chiến lược hành động chi tiết..."></textarea>
                    </div>
                  </div>
                  </div>

                </div>

                {/* CỘT PHẢI (Tỷ lệ 7) */}`,
`                      <textarea className="form-control rounded-3 w-100 h-100" style={{ minHeight: "150px", resize: "none" }} placeholder="Nhập chiến lược hành động chi tiết..."></textarea>
                    </div>
                  </div>

                </div>

                {/* CỘT PHẢI (Tỷ lệ 7) */}`
);

// --- 3. CÁC CÔNG VIỆC CẦN THỰC HIỆN NGAY ---
const oldCongViec = `                    <SectionTitle 
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

const newCongViec = `                    <SectionTitle 
                      title="Các công việc cần thực hiện ngay" 
                      className="mb-0 ps-1"
                      action={
                        <button className="btn btn-sm btn-light text-indigo fw-medium rounded-pill px-3 d-flex align-items-center gap-1 hover-bg-light-indigo transition-all">
                          <i className="bi bi-plus-lg"></i> Thêm việc
                        </button>
                      }
                    />
                    <div className="d-flex flex-column flex-grow-1" style={{ minHeight: "520px" }}>`;
code = code.replace(oldCongViec, newCongViec);

// Remove the two closing divs for CÁC CÔNG VIỆC
code = code.replace(
`                        </table>
                      </div>

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
          )}`
);

fs.writeFileSync('src/components/sales/plan/OemPlanTab.tsx', code);
console.log("Removed cards successfully");
