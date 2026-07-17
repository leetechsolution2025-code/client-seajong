"use client";

import React, { useState } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { SectionTitle } from "@/components/ui/SectionTitle";

export default function QaStandardsPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const steps: ModernStepItem[] = [
    { num: 1, id: "purchase", title: "Mua hàng", desc: "Tiêu chuẩn kiểm định vật tư nhập kho", icon: "bi-box-seam" },
    { num: 2, id: "production", title: "Sản xuất", desc: "Tiêu chuẩn chất lượng sản phẩm", icon: "bi-tools" },
    { num: 3, id: "measurement", title: "Đo lường", desc: "Tiêu chuẩn thiết bị đo lường", icon: "bi-rulers" },
  ];

  return (
    <StandardPage
      title="Tiêu chuẩn chất lượng"
      description="Quản lý bộ tiêu chuẩn kỹ thuật áp dụng cho sản phẩm và vật tư"
      color="indigo"
      icon="bi-award"
      useCard={false}
      hideTicker={true}
    >
      <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
        <style>{`
          .right-column-text-sm .accordion-button { font-size: 14px !important; }
          .right-column-text-sm .small { font-size: 13px !important; }
          .right-column-text-sm .fw-bold.small { font-size: 13.5px !important; }
        `}</style>
        <WorkflowCard
          stepper={
            <ModernStepper
              steps={steps}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              paddingX={0}
              paddingY={8}
            />
          }
          contentPadding="p-4"
        >
          {currentStep === 1 && (
            <div className="animation-fade-in" style={{ overflowX: "hidden" }}>
              <div className="row g-4">
                {/* Cột trái: Quy trình 4 bước */}
                <div className="col-12 col-xl-5">
                  <SectionTitle title="Quy trình 4 bước kiểm định đầu vào" icon="bi-signpost-split text-primary" className="mb-3" />
                  
                  <div className="d-flex flex-column gap-2" style={{ fontSize: 12.5 }}>
                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-primary rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <span className="badge bg-primary text-white me-2">Bước 1</span> 
                        Kiểm tra hồ sơ
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li>Đối chiếu Phiếu giao hàng / Packing List.</li>
                        <li>Kiểm tra mã sản phẩm khớp với vỏ thùng.</li>
                        <li>Đếm số lượng khai báo.</li>
                        <li>Kiểm tra vỏ thùng (móp méo, rách, ngấm nước).</li>
                      </ul>
                    </div>

                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-info rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <span className="badge bg-info text-white me-2">Bước 2</span> 
                        Khui thùng và lấy mẫu
                      </div>
                      <p className="text-muted mb-2">Quy tắc lấy mẫu ngẫu nhiên nhanh (bằng mắt):</p>
                      <ul className="text-muted mb-0 ps-3">
                        <li><strong>&lt; 50 cái:</strong> Lấy ngẫu nhiên 5 cái</li>
                        <li><strong>51 - 150 cái:</strong> Lấy ngẫu nhiên 20 cái</li>
                        <li><strong>151 - 500 cái:</strong> Lấy ngẫu nhiên 32 cái</li>
                        <li className="text-secondary opacity-75 fst-italic mt-1" style={{ listStyle: 'none' }}><i className="bi bi-info-circle me-1"></i>Lấy rải rác trên/giữa/đáy pallet.</li>
                      </ul>
                    </div>

                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-warning rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <span className="badge bg-warning text-dark me-2">Bước 3</span> 
                        Đánh giá bằng mắt và tay
                      </div>
                      <div className="text-muted">Thực hiện tại bàn QC với ánh sáng tốt. Đánh giá 3 khía cạnh: Ngoại quan, Cảm giác (Vật lý), Phụ kiện & Đóng gói.</div>
                    </div>

                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-success rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <span className="badge bg-success text-white me-2">Bước 4</span> 
                        Dán tem quyết định
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <div className="p-2 bg-success bg-opacity-10 rounded border border-success border-opacity-25 flex-grow-1">
                          <div className="fw-bold text-success mb-1" style={{ fontSize: 13 }}><i className="bi bi-check-circle-fill me-1"></i> PASS</div>
                          <div className="text-muted" style={{ fontSize: 11.5 }}>Dán tem xanh, ký xác nhận, nhập kho.</div>
                        </div>
                        <div className="p-2 bg-danger bg-opacity-10 rounded border border-danger border-opacity-25 flex-grow-1">
                          <div className="fw-bold text-danger mb-1" style={{ fontSize: 13 }}><i className="bi bi-x-circle-fill me-1"></i> FAIL</div>
                          <div className="text-muted" style={{ fontSize: 11.5 }}>Dán tem đỏ, cách ly, khai báo lỗi (ticket).</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <SectionTitle title="Bảng phân loại lỗi và quyết định" icon="bi-clipboard-x text-danger" className="mb-3 mt-4" />
                  <div className="d-flex flex-column gap-2" style={{ fontSize: 12.5 }}>
                    <div className="px-3 py-2 border rounded-3 bg-danger bg-opacity-10 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-danger rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-danger mb-1" style={{ fontSize: 13.5 }}>
                        Lỗi nguy hiểm (Critical) - BÁC BỎ 100%
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li>Nứt vỡ thân sứ, nứt nắp kính bếp từ.</li>
                        <li>Nứt ngầm thân đồng (rò nước ngay lập tức).</li>
                        <li>Hở lõi dây điện nguồn.</li>
                      </ul>
                    </div>

                    <div className="px-3 py-2 border rounded-3 bg-warning bg-opacity-10 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-warning rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        Lỗi nặng (Major) - LẬP BIÊN BẢN (NCR)
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li>Sứt ren nối vặn không vào, động cơ kẹt cứng.</li>
                        <li>Bề mặt mạ phồng rộp, nắp bồn cầu rơi tự do.</li>
                      </ul>
                    </div>

                    <div className="px-3 py-2 border rounded-3 bg-success bg-opacity-10 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-success rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-success mb-1" style={{ fontSize: 13.5 }}>
                        Lỗi nhẹ (Minor) - XEM XÉT
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li>Xước nhẹ mặt sau hoặc gầm vòi sen, lệch màu carton.</li>
                        <li>Bavia nhựa nhỏ ở nắp bồn cầu (không sắc nhọn).</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Cột phải: Tiêu chuẩn chi tiết */}
                <div className="col-12 col-xl-7 pe-xl-3 right-column-text-sm">
                  <SectionTitle title="I. Tiêu chuẩn linh kiện vệ sinh" icon="bi-droplet text-primary" className="mb-3" />
                  
                  <div className="accordion custom-accordion mb-4" id="accordionIqcSanitary">
                    
                    {/* Nhóm 1 */}
                    <div className="accordion-item border-0 mb-3 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseIqc1" aria-expanded="true">
                          1. Nhóm linh kiện kim loại và xi mạ
                        </button>
                      </h2>
                      <div id="collapseIqc1" className="accordion-collapse collapse show" data-bs-parent="#accordionIqcSanitary">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(13, 110, 253, 0.1)", color: "#0d6efd" }}>
                                <i className="bi bi-eye fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu ngoại quan (mắt thường)</div>
                                <div className="small text-muted mb-1"><strong>Bề mặt thô:</strong> Không rỗ khí, nứt ngầm, xỉ lò hoặc ba-via nhọn.</div>
                                <div className="small text-muted"><strong>Đã mạ (Chrome/PVD):</strong> Sáng bóng. <span className="text-danger fw-medium">Không nổ mạ, bong tróc, ố vàng, xước mặt tiền &gt; 2mm.</span></div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(25, 135, 84, 0.1)", color: "#198754" }}>
                                <i className="bi bi-tools fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu cơ học (tay sờ và thử nhanh)</div>
                                <div className="small text-muted mb-1"><strong>Kiểm tra ren:</strong> Vặn dưỡng ren ăn khớp ngọt, không sượng kẹt, mẻ hay dập ren.</div>
                                <div className="small text-muted"><strong>Độ mịn:</strong> Vuốt láng mịn, không cợn ráp.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nhóm 2 */}
                    <div className="accordion-item border-0 mb-3 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseIqc2" aria-expanded="false">
                          2. Nhóm sứ vệ sinh mua ngoài hoặc gia công
                        </button>
                      </h2>
                      <div id="collapseIqc2" className="accordion-collapse collapse" data-bs-parent="#accordionIqcSanitary">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(13, 110, 253, 0.1)", color: "#0d6efd" }}>
                                <i className="bi bi-eye fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu ngoại quan (mắt thường)</div>
                                <div className="small text-muted mb-1"><strong>Lớp men sứ:</strong> Phủ đều 100%, trắng sáng. <span className="text-danger fw-medium">Từ chối: Nứt chân chim, châm kim &gt; 0.5mm, mỏng men.</span></div>
                                <div className="small text-muted"><strong>Độ phẳng:</strong> Đặt úp chậu không bập bênh (độ hở ≤ 1mm).</div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(25, 135, 84, 0.1)", color: "#198754" }}>
                                <i className="bi bi-hammer fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu cơ học (gõ)</div>
                                <div className="small text-muted"><strong>Kiểm tra âm thanh:</strong> Gõ nhẹ thân sứ nghe thanh, giòn (coong coong). <span className="text-danger fw-medium">Kêu "bộp bộp" đục và trầm = nứt ngầm (loại bỏ).</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nhóm 3 */}
                    <div className="accordion-item border-0 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseIqc3" aria-expanded="false">
                          3. Nhóm linh kiện phi kim loại (gioăng, nắp nhựa)
                        </button>
                      </h2>
                      <div id="collapseIqc3" className="accordion-collapse collapse" data-bs-parent="#accordionIqcSanitary">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(13, 110, 253, 0.1)", color: "#0d6efd" }}>
                                <i className="bi bi-eye fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu ngoại quan (mắt thường)</div>
                                <div className="small text-muted mb-1"><strong>Gioăng đệm:</strong> Cao su mịn, không tạp chất, không bavia thừa viền.</div>
                                <div className="small text-muted"><strong>Nắp nhựa:</strong> Đều màu với thân sứ, không lồi lõm hay co ngót.</div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(25, 135, 84, 0.1)", color: "#198754" }}>
                                <i className="bi bi-arrows-collapse fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu cơ học (co giãn)</div>
                                <div className="small text-muted"><strong>Độ đàn hồi:</strong> Kéo giãn gấp đôi phải co lại hình dạng cũ lập tức, không biến dạng hay nứt.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <SectionTitle title="II. Tiêu chuẩn linh kiện nhà bếp" icon="bi-fan text-warning" className="mb-3" />
                  
                  <div className="accordion custom-accordion" id="accordionIqcKitchen">
                    {/* Nhóm 4 */}
                    <div className="accordion-item border-0 mb-3 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseIqc4" aria-expanded="false">
                          1. Nhóm linh kiện cơ khí và inox
                        </button>
                      </h2>
                      <div id="collapseIqc4" className="accordion-collapse collapse" data-bs-parent="#accordionIqcKitchen">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(255, 193, 7, 0.1)", color: "#ffc107" }}>
                                <i className="bi bi-eye fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu ngoại quan (mắt thường)</div>
                                <div className="small text-muted mb-1"><strong>Bồn rửa inox:</strong> Đều vân đánh sọc, không ố hóa chất. Góc dập không nhăn nếp.</div>
                                <div className="small text-muted"><strong>Vỏ hút mùi:</strong> Đường giáp mí gấp khít đều, không hở khe lệch mép.</div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545" }}>
                                <i className="bi bi-hand-index-thumb fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu cơ học (thử lực)</div>
                                <div className="small text-muted"><strong>Độ cứng:</strong> Ấn mạnh lòng bồn hoặc vỏ hút mùi không bị bập bùng, lún lõm dễ dàng.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nhóm 5 */}
                    <div className="accordion-item border-0 mb-3 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseIqc5" aria-expanded="false">
                          2. Nhóm kính và mặt bếp
                        </button>
                      </h2>
                      <div id="collapseIqc5" className="accordion-collapse collapse" data-bs-parent="#accordionIqcKitchen">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(255, 193, 7, 0.1)", color: "#ffc107" }}>
                                <i className="bi bi-eye fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu ngoại quan (mắt thường)</div>
                                <div className="small text-muted">Kính trong suốt, không bọt khí ngầm. <span className="text-danger fw-medium">Không xước dăm dài &gt; 1mm.</span></div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545" }}>
                                <i className="bi bi-hand-index fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu cơ học (tay sờ)</div>
                                <div className="small text-muted"><strong>Bo viền kính:</strong> Vuốt dọc viền phải mịn màng. <span className="text-danger fw-medium">Cứa tay hoặc mẻ răm răng cưa = Loại bỏ ngay (dễ vỡ).</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nhóm 6 */}
                    <div className="accordion-item border-0 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseIqc6" aria-expanded="false">
                          3. Nhóm linh kiện điện và điện tử
                        </button>
                      </h2>
                      <div id="collapseIqc6" className="accordion-collapse collapse" data-bs-parent="#accordionIqcKitchen">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(255, 193, 7, 0.1)", color: "#ffc107" }}>
                                <i className="bi bi-eye fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu ngoại quan (mắt thường)</div>
                                <div className="small text-muted mb-1"><strong>Đấu nối:</strong> Bấm cốt chắc chắn, không hở lõi đồng.</div>
                                <div className="small text-muted"><strong>Bảng mạch:</strong> Mối hàn bóng tròn, không lem chì chập mạch hay bong mạch in.</div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545" }}>
                                <i className="bi bi-fan fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Yêu cầu cơ học (thử nhanh)</div>
                                <div className="small text-muted"><strong>Động cơ quạt:</strong> Quay tay cánh trơn tru, không kẹt, trục động cơ không rơ lỏng.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animation-fade-in" style={{ overflowX: "hidden" }}>
              <div className="row g-4">
                {/* Cột trái */}
                <div className="col-12 col-xl-5">
                  <SectionTitle title="Ngoại quan tổng quát và đóng gói" icon="bi-eye text-primary" className="mb-3" />
                  
                  <div className="d-flex flex-column gap-2" style={{ fontSize: 12.5 }}>
                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-primary rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <i className="bi bi-droplet-half text-primary me-2"></i>1. Bề mặt xi mạ, sơn tĩnh điện và phủ PVD (mạ chân không)
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li><strong>Màu sắc và độ sáng:</strong> Phủ đều 100%. <span className="text-danger fw-medium">Từ chối: Nổ mạ, bong tróc, ố xỉn, lệch màu.</span></li>
                        <li><strong>Độ mịn:</strong> Không cợn, ráp hoặc dính bụi sơn cứng đầu.</li>
                      </ul>
                    </div>

                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-info rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <i className="bi bi-heptagon-half text-info me-2"></i>2. Bề mặt gốm sứ và kính
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li><strong>Men sứ:</strong> Láng mịn như gương. <span className="text-danger fw-medium">Từ chối: Nứt chân chim, bọt khí ngầm, châm kim đen.</span></li>
                        <li><strong>Mặt kính:</strong> Phẳng tuyệt đối, cạnh bo mài mịn, không sứt mẻ.</li>
                      </ul>
                    </div>

                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-warning rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <i className="bi bi-boxes text-warning me-2"></i>3. Bề mặt gỗ, nhựa và đá
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li><strong>Khớp nối và khe hở:</strong> Ghép nối phải khít, keo không tràn.</li>
                        <li><strong>Bề mặt nhựa:</strong> Phẳng phiu, không bị co móp do co ngót nhiệt.</li>
                      </ul>
                    </div>

                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative mt-2">
                      <div className="position-absolute top-0 start-0 h-100 bg-secondary rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <i className="bi bi-box-seam text-secondary me-2"></i>Quy trình khui thùng và đóng gói
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li><strong>Hồ sơ và phụ kiện:</strong> Đầy đủ chi tiết phụ trợ, phiếu hướng dẫn lắp đặt, phiếu bảo hành.</li>
                        <li><strong>Chống va đập:</strong> Xốp nẹp dày ≥3cm, lắc không kêu. Hàng nặng phải có pallet gỗ bảo vệ.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Cột phải: Tính năng & Cơ học */}
                <div className="col-12 col-xl-7 pe-xl-3 right-column-text-sm">
                  <SectionTitle title="Tiêu chuẩn tính năng và cơ học" icon="bi-tools text-success" className="mb-3" />
                  
                  <div className="accordion custom-accordion" id="accordionStandardsProduction">
                    
                    {/* Phần 1 */}
                    <div className="accordion-item border-0 mb-3 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseProdOne" aria-expanded="true">
                          Nhóm 1: Nhóm dẫn nước (sen vòi, bồn rửa)
                        </button>
                      </h2>
                      <div id="collapseProdOne" className="accordion-collapse collapse show" data-bs-parent="#accordionStandardsProduction">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(13, 110, 253, 0.1)", color: "#0d6efd" }}>
                                <i className="bi bi-speedometer2 fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Thử áp lực nhanh bằng tay</div>
                                <div className="small text-muted">Đưa khí nén hoặc nước tĩnh 4 - 6 bar. <span className="text-danger fw-medium">Thân sản phẩm KHÔNG rỉ nước/xì khí, đọng ẩm.</span></div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(13, 110, 253, 0.1)", color: "#0d6efd" }}>
                                <i className="bi bi-nut fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Kiểm tra ren khớp nối (G1/2, G3/4)</div>
                                <div className="small text-muted">Dùng tay vặn vào dưỡng ren chuẩn. Ren ăn khớp êm ái, trơn tru, không kẹt lỏng.</div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(13, 110, 253, 0.1)", color: "#0d6efd" }}>
                                <i className="bi bi-joystick fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Kiểm tra bộ phận chuyển động (van gạt, cần xoay)</div>
                                <div className="small text-muted">Góc xoay mượt, không rít. Khi gạt đóng mở phải đầm tay, không lỏng lẻo trôi tự do.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phần 2 */}
                    <div className="accordion-item border-0 mb-3 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseProdTwo" aria-expanded="false">
                          Nhóm 2: Nhóm sứ vệ sinh và thiết bị cơ học
                        </button>
                      </h2>
                      <div id="collapseProdTwo" className="accordion-collapse collapse" data-bs-parent="#accordionStandardsProduction">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(25, 135, 84, 0.1)", color: "#198754" }}>
                                <i className="bi bi-door-open fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Cơ cấu đóng mở (rơi êm, bản lề)</div>
                                <div className="small text-muted">Nắp bồn cầu rơi êm từ từ. Bản lề tủ đóng mở 3 đến 5 lần êm, khít đều, không vênh mép.</div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(25, 135, 84, 0.1)", color: "#198754" }}>
                                <i className="bi bi-record-circle fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Hệ thống nút nhấn và bộ xả bồn cầu</div>
                                <div className="small text-muted">Nhấn xả thử, nút nhấn phải có độ đàn hồi nảy lên ngay lập tức, không kẹt chìm.</div>
                              </div>
                            </div>

                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(25, 135, 84, 0.1)", color: "#198754" }}>
                                <i className="bi bi-water fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Đường ống thoát xả (ống siphon)</div>
                                <div className="small text-muted">Mặt trong đường ống xả bồn cầu phải phủ men mịn để không bám chất bẩn.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phần 3 */}
                    <div className="accordion-item border-0 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseProdThree" aria-expanded="false">
                          Nhóm 3: Nhóm thiết bị điện và điện tử
                        </button>
                      </h2>
                      <div id="collapseProdThree" className="accordion-collapse collapse" data-bs-parent="#accordionStandardsProduction">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(255, 193, 7, 0.1)", color: "#ffc107" }}>
                                <i className="bi bi-lightning-charge fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Kiểm tra đấu nối và tiếp điện</div>
                                <div className="small text-muted">Dây nguồn cốt chắc chắn, không hở đồng. Phích cắm không móp méo chân cắm.</div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(255, 193, 7, 0.1)", color: "#ffc107" }}>
                                <i className="bi bi-tablet fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Bảng điều khiển cảm ứng</div>
                                <div className="small text-muted">Phím phản hồi bíp ngay khi nhấn khô hoặc ẩm. Dải đèn LED hiển thị đầy đủ nét, không mờ.</div>
                              </div>
                            </div>

                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(255, 193, 7, 0.1)", color: "#ffc107" }}>
                                <i className="bi bi-volume-up fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Độ ồn và rung lắc cơ học</div>
                                <div className="small text-muted">Công suất lớn nhất: Chạy êm, không tiếng va quệt dị vật, vỏ máy không rung lắc mạnh.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="animation-fade-in" style={{ overflowX: "hidden" }}>
              <div className="row g-4">
                {/* Cột trái: Tính pháp lý */}
                <div className="col-12 col-xl-5">
                  <SectionTitle title="Tính pháp lý & trạng thái thiết bị" icon="bi-shield-check text-primary" className="mb-3" />
                  
                  <div className="mb-3 text-muted" style={{ fontSize: 13.5 }}>
                    Đối chiếu thiết bị với <strong className="text-dark">"Tiêu chuẩn 3 Có"</strong> trước khi sử dụng:
                  </div>

                  <div className="d-flex flex-column gap-2" style={{ fontSize: 12.5 }}>
                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-success rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <i className="bi bi-patch-check-fill text-success me-2"></i>1. CÓ Tem hiệu chuẩn (Tem xanh)
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li>Tem hiệu chuẩn nguyên vẹn, không rách nát, mờ chữ.</li>
                        <li>Đọc ngày hiệu chuẩn gần nhất và ngày hết hạn. <span className="text-danger fw-medium">Quá hạn = Gửi đi hiệu chuẩn lại ngay.</span></li>
                      </ul>
                    </div>

                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-primary rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <i className="bi bi-qr-code-scan text-primary me-2"></i>2. CÓ Mã định danh (Device ID)
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li>Thiết bị được khắc hoặc dán nhãn mã số quản lý (Ví dụ: TK-IQC-01).</li>
                        <li>Đối chiếu đúng với Nhật ký quản lý thiết bị đo lường.</li>
                      </ul>
                    </div>

                    <div className="px-3 py-2 border rounded-3 bg-light bg-opacity-50 position-relative">
                      <div className="position-absolute top-0 start-0 h-100 bg-warning rounded-start-3" style={{ width: 4 }}></div>
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: 13.5 }}>
                        <i className="bi bi-box-seam-fill text-warning me-2"></i>3. CÓ Hộp đựng bảo vệ chuyên dụng
                      </div>
                      <ul className="text-muted mb-0 ps-3">
                        <li>Khi không sử dụng phải cất trong hộp nhựa có mút xốp.</li>
                        <li><span className="text-danger fw-medium">KHÔNG</span> để lăn lóc trên bàn/kệ tránh va đập sai lệch.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Cột phải: Tiêu chuẩn đánh giá */}
                <div className="col-12 col-xl-7 pe-xl-3 right-column-text-sm">
                  <SectionTitle title="Tiêu chuẩn đánh giá trực quan (Mắt & Tay)" icon="bi-rulers text-success" className="mb-3" />
                  
                  <div className="accordion custom-accordion mb-4" id="accordionIqcMeasurement">
                    
                    {/* Nhóm 1 */}
                    <div className="accordion-item border-0 mb-3 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMeas1" aria-expanded="true">
                          1. Thước kẹp điện tử / Thước kẹp cơ (Vernier Calipers)
                        </button>
                      </h2>
                      <div id="collapseMeas1" className="accordion-collapse collapse show" data-bs-parent="#accordionIqcMeasurement">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(13, 110, 253, 0.1)", color: "#0d6efd" }}>
                                <i className="bi bi-eye fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Đánh giá bằng mắt (Visual)</div>
                                <div className="small text-muted mb-1"><strong>Màn hình & Vạch chia:</strong> Số hiển thị rõ, không chập chờn. Vạch chia sắc nét, không mờ xước.</div>
                                <div className="small text-muted"><strong>Độ khít (Lọt sáng):</strong> Khép mỏ đo hướng lên đèn. <span className="text-danger fw-medium">Tuyệt đối không lọt khe sáng.</span></div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(25, 135, 84, 0.1)", color: "#198754" }}>
                                <i className="bi bi-hand-index fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Đánh giá bằng tay (Tactile)</div>
                                <div className="small text-muted mb-1"><strong>Kéo con trượt:</strong> Thao tác trơn tru, đầm tay, không sượng kẹt.</div>
                                <div className="small text-muted"><strong>Điểm 0 (Zero-point):</strong> Khép chặt mỏ đo, phải hiển thị đúng <span className="fw-medium text-dark">0.00 mm</span> hoặc trùng vạch 0 chuẩn.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nhóm 2 */}
                    <div className="accordion-item border-0 mb-3 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMeas2" aria-expanded="false">
                          2. Dưỡng đo ren chuẩn (Thread Ring/Plug Gauge)
                        </button>
                      </h2>
                      <div id="collapseMeas2" className="accordion-collapse collapse" data-bs-parent="#accordionIqcMeasurement">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(13, 110, 253, 0.1)", color: "#0d6efd" }}>
                                <i className="bi bi-eye fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Đánh giá bằng mắt (Visual)</div>
                                <div className="small text-muted mb-1">Các bước răng phải sắc sảo, không sứt mẻ dập ren.</div>
                                <div className="small text-muted">Bề mặt <span className="text-danger fw-medium">không rỉ sét, bám dầu mỡ bẩn</span> gây sai lệch.</div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(25, 135, 84, 0.1)", color: "#198754" }}>
                                <i className="bi bi-nut fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Đánh giá bằng tay (Tactility)</div>
                                <div className="small text-muted mb-1"><strong>Vuốt vòng ren:</strong> Răng đều đặn, không bị gai gợn bavia.</div>
                                <div className="small text-muted"><strong>Vặn mẫu chuẩn (Master Sample):</strong> Đi vào êm ái, không lắc lư rơ lỏng.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nhóm 3 */}
                    <div className="accordion-item border-0 mb-3 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMeas3" aria-expanded="false">
                          3. Đồng hồ đo áp suất nước/khí nén (Pressure Gauges)
                        </button>
                      </h2>
                      <div id="collapseMeas3" className="accordion-collapse collapse" data-bs-parent="#accordionIqcMeasurement">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(13, 110, 253, 0.1)", color: "#0d6efd" }}>
                                <i className="bi bi-eye fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Đánh giá bằng mắt (Visual)</div>
                                <div className="small text-muted mb-1"><strong>Mặt kính:</strong> Trong suốt, không nứt, không hấp hơi nước.</div>
                                <div className="small text-muted"><strong>Điểm 0 (Zero-point):</strong> Khi không áp lực kim phải chỉ đúng vạch 0. <span className="text-danger fw-medium">Lệch kim = Loại bỏ.</span></div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545" }}>
                                <i className="bi bi-speedometer2 fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Đánh giá chức năng (Function)</div>
                                <div className="small text-muted"><strong>Bật áp lực:</strong> Kim lên đều, mượt. <span className="text-danger fw-medium">Giật cục, nhảy cóc, kẹt lơ lửng = Hỏng bộ truyền động.</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nhóm 4 */}
                    <div className="accordion-item border-0 bg-white rounded-3 shadow-sm">
                      <h2 className="accordion-header">
                        <button className="accordion-button bg-light fw-bold text-dark rounded-3 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMeas4" aria-expanded="false">
                          4. Cân điện tử (Cân định lượng linh kiện, cân bồn cầu)
                        </button>
                      </h2>
                      <div id="collapseMeas4" className="accordion-collapse collapse" data-bs-parent="#accordionIqcMeasurement">
                        <div className="accordion-body">
                          <div className="d-flex flex-column gap-3">
                            <div className="d-flex gap-3 align-items-start border-bottom pb-3">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(13, 110, 253, 0.1)", color: "#0d6efd" }}>
                                <i className="bi bi-eye fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Đánh giá bằng mắt (Visual)</div>
                                <div className="small text-muted mb-1"><strong>Ngoại quan:</strong> Mặt phẳng, không móp. 4 chân đế cao su đủ, không mòn lệch.</div>
                                <div className="small text-muted"><strong>Độ thăng bằng:</strong> Phẳng tuyệt đối (kiểm tra bằng giọt nước nếu có).</div>
                              </div>
                            </div>
                            
                            <div className="d-flex gap-3 align-items-start">
                              <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545" }}>
                                <i className="bi bi-sliders fs-5"></i>
                              </div>
                              <div>
                                <div className="fw-bold small text-dark mb-1">Đánh giá chức năng (Function)</div>
                                <div className="small text-muted mb-1"><strong>Trừ bì:</strong> Bấm TARE màn hình phải về đúng 0.0 g.</div>
                                <div className="small text-muted"><strong>Đối chiếu sai số:</strong> Đặt quả cân chuẩn (Master Weight) lên đối chiếu (VD: Đặt quả 1kg hiển thị đúng 1000g hoặc ±1g).</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </WorkflowCard>
      </div>
    </StandardPage>
  );
}
