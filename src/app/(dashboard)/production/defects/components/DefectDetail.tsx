import React from 'react';
import { DefectRecord, DefectStatus, MOCK_DEFECTS } from '../mockData';

interface DefectDetailProps {
  defectId: string;
  onBack: () => void;
}

export function DefectDetail({ defectId, onBack }: DefectDetailProps) {
  const defect = MOCK_DEFECTS.find(d => d.id === defectId);

  if (!defect) return <div>Không tìm thấy hồ sơ</div>;

  return (
    <div className="h-100 d-flex flex-column" style={{ fontSize: '13px' }}>
      {/* Header Bar */}
      <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
        <div className="d-flex align-items-center gap-3">
          <button onClick={onBack} className="btn btn-sm btn-light border rounded-circle">
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h6 className="mb-0 fw-bold fs-5">{defect.code}</h6>
            <span className="text-muted small">
              {defect.source === 'WARRANTY' ? 'Hồ sơ bảo hành' : 'Lỗi phát sinh nội bộ'}
            </span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {defect.status === 'WAITING_APPROVAL' && (
            <span className="badge bg-warning text-dark px-3 py-2 border border-warning rounded-pill">
              <i className="bi bi-clock-history me-2"></i> Còn 2h 30m để duyệt
            </span>
          )}
          <div className="dropdown">
            <button className="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="dropdown">
              <i className="bi bi-three-dots-vertical"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><a className="dropdown-item" href="#">In phiếu</a></li>
              <li><a className="dropdown-item text-danger" href="#">Huỷ hồ sơ</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content 70/30 */}
      <div className="row g-4 flex-grow-1 overflow-hidden">
        {/* Left: 70% Workspace */}
        <div className="col-12 col-xl-8 d-flex flex-column h-100 overflow-auto pe-xl-3" style={{ paddingBottom: '100px' }}>
          
          {/* Progress Stepper (Mock) */}
          <div className="card shadow-sm border-0 mb-4 rounded-4">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-4 text-primary" style={{ fontSize: '14px' }}>Tiến trình xử lý</h6>
              <div className="d-flex justify-content-between position-relative">
                <div className="position-absolute top-50 start-0 end-0 translate-middle-y bg-light" style={{ height: 4, zIndex: 0 }}></div>
                {defect.source === 'WARRANTY' ? (
                  <>
                    <StepItem active={true} completed={true} title="Tiếp nhận" icon="bi-headset" />
                    <StepItem active={defect.status === 'NEW'} completed={defect.status !== 'NEW'} title="Phân loại" icon="bi-search" />
                    <StepItem active={defect.status === 'TECH_EVALUATING'} completed={['WAITING_APPROVAL', 'PROCESSING', 'COMPLETED'].includes(defect.status)} title="Nhận hàng & Đánh giá" icon="bi-box-seam" />
                    <StepItem active={['WAITING_APPROVAL', 'PROCESSING'].includes(defect.status)} completed={defect.status === 'COMPLETED'} title="Xử lý" icon="bi-tools" />
                    <StepItem active={false} completed={defect.status === 'COMPLETED'} title="Đổi mới/Trả" icon="bi-truck" />
                    <StepItem active={false} completed={defect.status === 'COMPLETED'} title="Hoàn thành" icon="bi-check-circle" />
                  </>
                ) : (
                  <>
                    <StepItem active={true} completed={true} title="Khai báo" icon="bi-file-earmark-text" />
                    <StepItem active={defect.status === 'TECH_EVALUATING'} completed={defect.status !== 'TECH_EVALUATING' && defect.status !== 'NEW'} title="Đánh giá" icon="bi-tools" />
                    <StepItem active={defect.status === 'WAITING_APPROVAL'} completed={['PROCESSING', 'COMPLETED'].includes(defect.status)} title="Duyệt phương án" icon="bi-person-check" />
                    <StepItem active={defect.status === 'PROCESSING'} completed={defect.status === 'COMPLETED'} title="Nhập kho" icon="bi-box-arrow-in-down" />
                    <StepItem active={false} completed={defect.status === 'COMPLETED'} title="Hoàn thành" icon="bi-check-circle" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Accordions */}
          <div className="accordion" id="defectAccordion">
            {/* Thẻ 1: Thông tin cơ bản */}
            <div className="accordion-item border-0 shadow-sm mb-3 rounded-4 overflow-hidden">
              <h2 className="accordion-header">
                <button className="accordion-button bg-white fw-bold text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne">
                  <i className="bi bi-info-circle text-primary me-2"></i> Thông tin tiếp nhận
                </button>
              </h2>
              <div id="collapseOne" className="accordion-collapse collapse show" data-bs-parent="#defectAccordion">
                <div className="accordion-body bg-light">
                  {defect.source === 'WARRANTY' && (
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-body">
                        <h6 className="fw-bold mb-3">Thông tin Khách hàng</h6>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="text-muted small">Khách hàng</div>
                            <div className="fw-medium">{defect.customerName}</div>
                          </div>
                          <div className="col-md-6">
                            <div className="text-muted small">Số điện thoại</div>
                            <div className="fw-medium">{defect.customerPhone}</div>
                          </div>
                          <div className="col-md-12">
                            <div className="text-muted small">Địa chỉ</div>
                            <div className="fw-medium">{defect.customerAddress}</div>
                          </div>
                          <div className="col-md-6">
                            <div className="text-muted small">Ngày mua hàng</div>
                            <div className="fw-medium">{defect.purchaseDate ? new Date(defect.purchaseDate).toLocaleDateString('vi-VN') : 'Không rõ'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <h6 className="fw-bold mb-3">Thông tin Sản phẩm lỗi</h6>
                      <div className="row g-3">
                        <div className="col-md-8">
                          <div className="text-muted small">Sản phẩm</div>
                          <div className="fw-medium text-primary">{defect.productName}</div>
                          <div className="small text-muted">{defect.productCode}</div>
                        </div>
                        <div className="col-md-4">
                          <div className="text-muted small">Số lượng</div>
                          <div className="fw-medium text-danger fs-5">{defect.quantity}</div>
                        </div>
                        <div className="col-12">
                          <div className="text-muted small">Mô tả hiện trạng</div>
                          <div className="p-3 bg-light rounded mt-1 border">{defect.description}</div>
                        </div>
                        {defect.mediaUrls && defect.mediaUrls.length > 0 && (
                          <div className="col-12">
                            <div className="text-muted small mb-2">Hình ảnh / Video đính kèm</div>
                            <div className="d-flex gap-2">
                              {defect.mediaUrls.map((url, idx) => (
                                <img key={idx} src={url} alt="Lỗi" className="rounded border" style={{ width: 100, height: 100, objectFit: 'cover' }} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Thẻ 2: Phân tích Kỹ thuật */}
            <div className="accordion-item border-0 shadow-sm mb-3 rounded-4 overflow-hidden">
              <h2 className="accordion-header">
                <button className="accordion-button bg-white fw-bold text-dark collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo">
                  <i className="bi bi-tools text-primary me-2"></i> Chẩn đoán & Phân loại
                </button>
              </h2>
              <div id="collapseTwo" className="accordion-collapse collapse" data-bs-parent="#defectAccordion">
                <div className="accordion-body bg-light">
                  {defect.isRepairable !== undefined ? (
                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        <div className="alert alert-info border-0 d-flex align-items-center">
                          <i className="bi bi-info-circle-fill fs-4 me-3"></i>
                          <div>
                            <div className="fw-bold">Kết luận kỹ thuật</div>
                            <div>{defect.isRepairable ? "Có khả năng sửa chữa / khắc phục" : "Không thể sửa, cần rã xác / huỷ bỏ"}</div>
                          </div>
                        </div>
                        {defect.repairPlan && (
                          <div className="mt-3">
                            <div className="fw-bold mb-1">Phương án đề xuất</div>
                            <div className="p-3 bg-light rounded border">{defect.repairPlan}</div>
                          </div>
                        )}
                        {defect.materialCosts !== undefined && (
                          <div className="mt-3 d-flex justify-content-between align-items-center p-3 bg-white border rounded">
                            <span className="fw-medium">Kinh phí vật tư dự kiến:</span>
                            <span className="fw-bold text-danger fs-5">{defect.materialCosts.toLocaleString('vi-VN')} đ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 text-muted">
                      Chưa có kết quả chẩn đoán
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right: 30% Sticky Action Widget */}
        <div className="col-12 col-xl-4 h-100">
          <div className="card shadow-sm border-primary rounded-4 sticky-top" style={{ top: '1rem', borderWidth: 2 }}>
            <div className="card-header bg-primary text-white p-3 rounded-top-4 border-0">
              <h6 className="mb-0 fw-bold" style={{ fontSize: '14px' }}><i className="bi bi-lightning-charge-fill text-warning me-2"></i> Trạm xử lý (Action Widget)</h6>
            </div>
            <div className="card-body p-4 bg-light">
              
              {defect.status === 'TECH_EVALUATING' && (
                <>
                  <div className="alert alert-warning border-0 small mb-4">
                    <i className="bi bi-bell-fill me-2"></i>Bạn đang ở vai trò <strong>Kỹ thuật</strong>. Vui lòng cập nhật chẩn đoán.
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Khả năng sửa chữa?</label>
                    <div className="d-flex gap-3">
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name="repairable" id="repYes" />
                        <label className="form-check-label text-success fw-medium" htmlFor="repYes">Có thể sửa</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name="repairable" id="repNo" />
                        <label className="form-check-label text-danger fw-medium" htmlFor="repNo">Rã xác / Huỷ</label>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Phương án xử lý</label>
                    <textarea className="form-control" rows={3} placeholder="Mô tả các bước cần làm..."></textarea>
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-medium">Kinh phí vật tư (VNĐ)</label>
                    <input type="number" className="form-control" placeholder="0" />
                  </div>
                  <button className="btn btn-primary w-100 py-2 fw-bold rounded-pill shadow-sm">
                    Gửi xin phê duyệt <i className="bi bi-arrow-right ms-2"></i>
                  </button>
                </>
              )}

              {defect.status === 'WAITING_APPROVAL' && (
                <>
                  <div className="alert alert-danger border-0 small mb-4">
                    <i className="bi bi-bell-fill me-2"></i>Cần <strong>Ban Giám Đốc</strong> duyệt phương án sửa chữa này.
                  </div>
                  <div className="bg-white p-3 rounded border mb-4 shadow-sm text-center">
                    <div className="text-muted small mb-1">Tổng kinh phí đề xuất</div>
                    <div className="text-danger fw-bold fs-3">{defect.materialCosts?.toLocaleString('vi-VN')} đ</div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-danger w-50 py-2 fw-bold rounded-pill">
                      <i className="bi bi-x-lg me-1"></i> Từ chối
                    </button>
                    <button className="btn btn-success w-50 py-2 fw-bold rounded-pill shadow-sm">
                      <i className="bi bi-check-lg me-1"></i> Phê duyệt
                    </button>
                  </div>
                </>
              )}

              {defect.status === 'NEW' && (
                <>
                   <div className="alert alert-info border-0 small mb-4">
                    <i className="bi bi-bell-fill me-2"></i>Hồ sơ mới tiếp nhận. Vui lòng chuyển cho Kỹ thuật đánh giá.
                  </div>
                  <button className="btn btn-primary w-100 py-2 fw-bold rounded-pill shadow-sm">
                    Chuyển Kỹ thuật <i className="bi bi-send ms-2"></i>
                  </button>
                </>
              )}
              
              {defect.status === 'COMPLETED' && (
                <div className="text-center py-4">
                  <div className="display-4 text-success mb-3"><i className="bi bi-check-circle-fill"></i></div>
                  <h5 className="fw-bold">Hồ sơ đã hoàn tất</h5>
                  <p className="text-muted small mb-0">Sản phẩm đã được xử lý xong.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StepItem({ active, completed, title, icon }: { active: boolean, completed: boolean, title: string, icon: string }) {
  let color = "secondary";
  let bg = "bg-light text-secondary border";
  if (completed) {
    color = "success";
    bg = "bg-success text-white shadow-sm";
  } else if (active) {
    color = "primary";
    bg = "bg-primary text-white shadow ring-4";
  }

  return (
    <div className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 1, width: 80 }}>
      <div className={`rounded-circle d-flex align-items-center justify-content-center mb-2 ${bg}`} style={{ width: 40, height: 40 }}>
        {completed ? <i className="bi bi-check-lg fs-5"></i> : <i className={`bi ${icon}`}></i>}
      </div>
      <div className={`small fw-medium text-center text-${color}`} style={{ fontSize: '11px', lineHeight: '1.2' }}>{title}</div>
    </div>
  );
}
