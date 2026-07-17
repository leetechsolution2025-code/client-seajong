"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { DefectStatus } from "../mockData";
import { SectionTitle } from "@/components/ui/SectionTitle";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới',
  TECH_EVALUATING: 'Đang chẩn đoán',
  WAITING_APPROVAL: 'Chờ duyệt',
  WAITING_INVENTORY: 'Chờ kho',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn tất'
};

interface DefectProcessModalProps {
  defectId: string | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export function DefectProcessModal({ defectId, onClose, onRefresh }: DefectProcessModalProps) {
  const { data: defect, mutate } = useSWR(defectId ? `/api/production/defects/${defectId}` : null, fetcher);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('Sửa chữa tại chỗ');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!defectId) return null;

  const handleProcess = async (action: string, nextStatus: string) => {
    if (!note && action !== 'ĐÓNG HỒ SƠ') {
      alert('Vui lòng nhập ghi chú / phương án!');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/production/defects/${defectId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          nextStatus,
          note,
          performedBy: 'Hệ thống (Dev Test)'
        })
      });
      
      if (res.ok) {
        setNote('');
        mutate();
        if (onRefresh) onRefresh();
      } else {
        alert('Có lỗi xảy ra!');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi kết nối!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1055 }}>
        <div className="modal-dialog modal-fullscreen modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg overflow-hidden">
            <div className="modal-header bg-light border-bottom py-3">
              <h5 className="modal-title fw-bold">
                Xử lý hồ sơ: {defect?.code || 'Đang tải...'}
              </h5>
              <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
            </div>
            
            <div className="modal-body p-4 bg-white" style={{ minHeight: '60vh' }}>
              {!defect ? (
                <div className="text-center py-5 text-muted">Đang tải dữ liệu...</div>
              ) : defect.error ? (
                <div className="text-center py-5 text-danger">Không tìm thấy hồ sơ lỗi!</div>
              ) : (
                <div className="row g-4 h-100">
                  {/* Left Column: Info & Timeline */}
                  <div className="col-lg-5 d-flex flex-column gap-4">
                    <div className="bg-light rounded-4 border p-4">
                      <SectionTitle title="Thông tin gốc" icon="bi-info-circle" />
                      <div className="d-flex gap-4 small mb-3 text-muted">
                        <div>Sản phẩm: <strong className="text-dark">{defect.productName}</strong></div>
                        <div>Mã SP: <strong className="text-dark">{defect.productCode}</strong></div>
                        <div>SL lỗi: <strong className="text-danger">{defect.quantity}</strong></div>
                      </div>
                      <div className="p-3 bg-white rounded-3 small mb-3 border">
                        <strong>Mô tả hiện trạng:</strong><br/>
                        {defect.description || 'Không có mô tả'}
                      </div>
                      
                      {defect.mediaUrls && defect.mediaUrls.length > 0 && (
                        <div className="d-flex flex-wrap gap-2">
                          {defect.mediaUrls.map((url: string, i: number) => {
                            const isVideo = url.endsWith('.mp4');
                            return (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className="border rounded overflow-hidden position-relative" style={{width: 80, height: 80}}>
                                {isVideo ? <video src={url} className="w-100 h-100 object-fit-cover"/> : <img src={url} className="w-100 h-100 object-fit-cover"/>}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-4 border p-4 flex-grow-1">
                      <SectionTitle title="Lịch sử xử lý" icon="bi-clock-history" className="mb-4" />
                      
                      <div className="position-relative ms-2 ps-3 border-start border-2 border-primary border-opacity-25" style={{ fontSize: '13px' }}>
                        {defect.activities && defect.activities.map((act: any) => (
                          <div key={act.id} className="mb-4 position-relative">
                            <div className="position-absolute bg-primary rounded-circle" style={{ width: '12px', height: '12px', left: '-22px', top: '4px' }}></div>
                            <div className="text-muted small mb-1">{new Date(act.createdAt).toLocaleString()} • {act.performedBy}</div>
                            <div className="fw-bold text-dark mb-1">{act.action}</div>
                            {act.description && <div className="p-2 bg-light rounded border text-secondary">{act.description}</div>}
                          </div>
                        ))}
                        
                        <div className="mb-0 position-relative">
                          <div className="position-absolute bg-secondary rounded-circle" style={{ width: '10px', height: '10px', left: '-21px', top: '4px' }}></div>
                          <div className="text-muted small">Khởi tạo hồ sơ lỗi</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Action Board & BOM */}
                  <div className="col-lg-7 d-flex flex-column gap-4">
                    <div className="bg-white rounded-4 shadow-sm border p-4">
                      <SectionTitle 
                        title="Bảng Thao tác" 
                        icon="bi-gear" 
                        className="mb-4"
                        action={<span className="badge bg-dark rounded-pill px-3 py-2 fw-normal" style={{ fontSize: '13px', textTransform: 'none' }}>{STATUS_LABELS[defect.status] || defect.status}</span>}
                      />

                      {defect.status === 'COMPLETED' ? (
                        <div className="alert alert-success d-flex align-items-center rounded-3 border-0">
                          <i className="bi bi-check-circle-fill fs-4 me-3"></i>
                          <div>
                            <h6 className="mb-1 fw-bold">Đã hoàn tất</h6>
                            <p className="mb-0 small">Hồ sơ lỗi này đã được xử lý xong.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="row g-4">
                          <div className="col-md-6 border-end-md">
                            <div className="form-group h-100 d-flex flex-column">
                              <label className="form-label small fw-medium text-muted mb-3">Ghi chú / Phương án chẩn đoán <span className="text-danger">*</span></label>
                              <textarea 
                                className="form-control form-control-sm rounded-3 shadow-none flex-grow-1 border-opacity-50" 
                                placeholder="Nhập chi tiết về tình trạng lỗi và hướng xử lý..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                style={{ minHeight: '200px' }}
                              ></textarea>
                            </div>
                          </div>

                          <div className="col-md-6">
                            {(defect.status === 'NEW' || defect.status === 'TECH_EVALUATING') && (
                              <div className="d-flex flex-column h-100">
                                <label className="form-label small fw-medium text-muted mb-3">Chọn phương án (Cấp độ xử lý) <span className="text-danger">*</span></label>
                                
                                <div className="d-flex flex-column gap-2 mb-4">
                                  {['Sửa chữa tại chỗ', 'Thay linh kiện', 'Phân rã thu hồi vật tư linh kiện', 'Huỷ bỏ thay thế bằng hàng hoá mới'].map((opt, idx) => (
                                    <div key={opt} className="form-check p-0 m-0">
                                      <input 
                                        type="radio" 
                                        className="btn-check" 
                                        name="resolutionOptions" 
                                        id={`res-${idx}`} 
                                        autoComplete="off" 
                                        checked={resolution === opt}
                                        onChange={() => setResolution(opt)}
                                      />
                                      <label className="btn btn-outline-primary w-100 text-start text-wrap py-2 px-3 rounded-3 shadow-sm" htmlFor={`res-${idx}`} style={{ fontSize: '13px' }}>
                                        <span className="fw-bold me-1">Mức {idx + 1}:</span> {opt}
                                      </label>
                                    </div>
                                  ))}
                                </div>

                                <button 
                                  className="btn btn-primary fw-bold rounded-pill shadow-sm mt-auto py-2" 
                                  disabled={isSubmitting} 
                                  onClick={() => {
                                    const nextStatus = (resolution === 'Thay linh kiện' || resolution === 'Huỷ bỏ thay thế bằng hàng hoá mới') 
                                      ? 'WAITING_INVENTORY' 
                                      : 'PROCESSING';
                                    handleProcess(`QUYẾT ĐỊNH: ${resolution.toUpperCase()}`, nextStatus);
                                  }}
                                >
                                  {isSubmitting ? 'Đang xử lý...' : 'Lưu chẩn đoán & Quyết định'}
                                </button>
                              </div>
                            )}

                            {defect.status === 'WAITING_INVENTORY' && (
                              <div className="d-flex flex-column h-100 justify-content-center">
                                <button className="btn btn-primary fw-bold rounded-pill shadow-sm py-2" disabled={isSubmitting} onClick={() => handleProcess('NHẬN LINH KIỆN & XỬ LÝ', 'PROCESSING')}>
                                  Đã nhận linh kiện & Tiếp tục xử lý
                                </button>
                              </div>
                            )}

                            {defect.status === 'PROCESSING' && (
                              <div className="d-flex flex-column h-100 justify-content-center">
                                <button className="btn btn-success fw-bold rounded-pill shadow-sm py-2" disabled={isSubmitting} onClick={() => handleProcess('ĐÓNG HỒ SƠ', 'COMPLETED')}>
                                  Xác nhận Hoàn tất (Đóng hồ sơ)
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* BOM Card */}
                    <div className="bg-white rounded-4 shadow-sm border p-4 flex-grow-1">
                      <SectionTitle 
                        title="Vật tư linh kiện phân rã" 
                        icon="bi-box-seam" 
                        action={<span className="badge bg-light text-secondary border fw-normal" style={{ textTransform: 'none' }}>Theo định mức (BOM)</span>}
                      />
                      
                      <div className="table-responsive">
                        <table className="table table-hover align-middle table-sm border mb-0">
                          <thead className="table-light text-muted small">
                            <tr>
                              <th style={{ width: '40px' }} className="text-center">
                                <input type="checkbox" className="form-check-input shadow-none cursor-pointer" />
                              </th>
                              <th className="fw-medium">Mã VT</th>
                              <th className="fw-medium">Tên linh kiện</th>
                              <th className="fw-medium text-center">ĐVT</th>
                              <th className="fw-medium text-center">Số lượng / 1 SP</th>
                              <th className="fw-medium text-end">Tình trạng kho</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { id: 'VT-001', name: 'Lõi sen nóng lạnh phi 35', unit: 'Cái', qty: 1, stock: 145 },
                              { id: 'VT-015', name: 'Dây sen mạ Crom 1.5m', unit: 'Sợi', qty: 1, stock: 89 },
                              { id: 'VT-042', name: 'Bát sen tắm đứng nhựa ABS', unit: 'Cái', qty: 1, stock: 32 },
                              { id: 'VT-099', name: 'Ron cao su chống rò rỉ đệm 21', unit: 'Cái', qty: 2, stock: 500 },
                              { id: 'VT-023', name: 'Tay gạt sen đồng mạ Crom', unit: 'Cái', qty: 1, stock: 12 }
                            ].map(item => (
                               <tr key={item.id} className="cursor-pointer">
                                 <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                   <input type="checkbox" className="form-check-input shadow-none cursor-pointer" />
                                 </td>
                                 <td className="small text-muted">{item.id}</td>
                                 <td className="fw-medium small text-dark">{item.name}</td>
                                 <td className="text-center small text-muted">{item.unit}</td>
                                 <td className="text-center small fw-bold text-primary">{item.qty}</td>
                                 <td className="text-end small">
                                   <span className={item.stock > 20 ? "text-success" : "text-warning"}>{item.stock} sẵn có</span>
                                 </td>
                               </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 text-muted" style={{ fontSize: '12.5px' }}>
                        <i className="bi bi-info-circle me-1"></i> Bảng vật tư được tự động trích xuất dựa trên mã sản phẩm gốc <strong>{defect?.productCode}</strong>. Dùng để tham khảo khi có yêu cầu thay thế.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
