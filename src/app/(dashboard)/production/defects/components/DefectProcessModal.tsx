"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { DefectStatus } from "../mockData";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";

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
            
            <div className="modal-body p-2 bg-white" style={{ minHeight: '60vh', fontSize: '13px' }}>
              {!defect ? (
                <div className="text-center py-5 text-muted">Đang tải dữ liệu...</div>
              ) : defect.error ? (
                <div className="text-center py-5 text-danger">Không tìm thấy hồ sơ lỗi!</div>
              ) : (
                <div className="d-flex h-100 align-items-stretch" style={{ gap: '4px' }}>
                  {/* Left Column: Info & Timeline */}
                  <div className="d-flex flex-column flex-shrink-0" style={{ width: '420px' }}>
                    <div className="bg-white rounded-4 shadow-sm border overflow-hidden d-flex flex-column h-100">
                      
                      {/* Top Half: Info */}
                      <div className="p-3 bg-light border-bottom flex-shrink-0">
                        <SectionTitle title="Thông tin gốc" icon="bi-info-circle" className="mb-3" />
                        
                        <div className="small mb-3 text-muted">
                          <div className="mb-2">Sản phẩm: <strong className="text-dark">{defect.productName}</strong></div>
                          <div className="d-flex gap-4 mb-2">
                            <div>Mã SP: <strong className="text-dark">{defect.productCode}</strong></div>
                            <div>Số lượng: <strong className="text-danger">{defect.quantity}</strong></div>
                          </div>
                          <div className="d-flex gap-4">
                            <div>Mã định mức: <strong className="text-dark">{defect.bomCode || 'Không có'}</strong></div>
                          </div>
                        </div>
                        
                        {defect.mediaUrls && defect.mediaUrls.length > 0 && (
                          <>
                            <div className="small fw-bold text-dark mb-2">Hình ảnh thực tế:</div>
                            <div className="d-flex flex-wrap gap-2 mb-3">
                              {defect.mediaUrls.map((url: string, i: number) => {
                                const isVideo = url.endsWith('.mp4');
                                return (
                                  <a key={i} href={url} target="_blank" rel="noreferrer" className="border rounded overflow-hidden position-relative" style={{width: 80, height: 80}}>
                                    {isVideo ? <video src={url} className="w-100 h-100 object-fit-cover"/> : <img src={url} className="w-100 h-100 object-fit-cover"/>}
                                  </a>
                                );
                              })}
                            </div>
                          </>
                        )}

                        <SectionTitle title="Mô tả hiện trạng" icon="bi-card-text" className="mb-2" />
                        <div className="small text-muted mt-0">
                          {defect.description || 'Không có mô tả'}
                        </div>
                      </div>

                      {/* Bottom Half: BOM Table */}
                      <div className="flex-grow-1 position-relative" style={{ minHeight: 0 }}>
                        <FullWidthTableLayout 
                          className="h-100"
                          tableWrapperClassName="border-top"
                          header={
                            <SectionTitle 
                              className="m-0 py-1"
                              title="Vật tư linh kiện phân rã" 
                              icon="bi-box-seam" 
                              action={<span className="badge bg-danger text-white border-0 fw-normal" style={{ textTransform: 'none' }}>{defect.bomCode || 'Không có định mức'}</span>}
                            />
                          }
                          table={
                            <table className="table table-hover align-middle table-sm mb-0" style={{ '--bs-table-border-color': 'rgba(0,0,0,0.05)' } as React.CSSProperties}>
                              <thead className="text-muted small" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                <tr>
                                  <th style={{ width: '40px', borderBottomWidth: 1 }} className="text-center align-middle py-3">
                                    <input type="checkbox" className="form-check-input shadow-none cursor-pointer" />
                                  </th>
                                  <th style={{ borderBottomWidth: 1 }} className="fw-medium align-middle py-3">Tên linh kiện</th>
                                  <th style={{ borderBottomWidth: 1 }} className="fw-medium text-center align-middle py-3">ĐVT</th>
                                  <th style={{ borderBottomWidth: 1 }} className="fw-medium text-center align-middle py-3">Số lượng</th>
                                  <th style={{ borderBottomWidth: 1 }} className="fw-medium text-end align-middle py-3">Tồn kho</th>
                                </tr>
                              </thead>
                              <tbody>
                                {defect.bomItems && defect.bomItems.length > 0 ? (
                                  defect.bomItems.map((item: any) => (
                                     <tr key={item.id} className="cursor-pointer">
                                       <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                         <input type="checkbox" className="form-check-input shadow-none cursor-pointer" />
                                       </td>
                                       <td className="align-middle">
                                         <div className="fw-medium small text-dark">{item.name}</div>
                                         <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{item.id}</div>
                                       </td>
                                       <td className="text-center small text-muted">{item.unit}</td>
                                       <td className="text-center small fw-bold text-primary">{item.qty}</td>
                                       <td className="text-end small">
                                         <span className={item.stock > 20 ? "text-success" : (item.stock > 0 ? "text-warning" : "text-danger")}>{item.stock}</span>
                                       </td>
                                     </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={5} className="text-center py-4 text-muted small">
                                      Không có dữ liệu định mức cho sản phẩm này.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          }
                          footer={
                            <div className="text-muted w-100" style={{ fontSize: '12.5px' }}>
                              <i className="bi bi-info-circle me-1"></i> Trích xuất tự động dựa trên <strong>{defect?.productCode}</strong>.
                            </div>
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Action Board & BOM */}
                  <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
                    <div className="bg-white rounded-4 shadow-sm border d-flex flex-column h-100 overflow-hidden">
                      
                      {/* Customer Info header/section */}
                      <div className="p-3 bg-light border-bottom flex-shrink-0">
                        <div className="d-flex align-items-center text-muted">
                          <div className="pe-4 border-end">
                            <div className="mb-1">Khách hàng: <strong className="text-dark">{defect.customerName || 'Không có'}</strong></div>
                            <div className="d-flex gap-4">
                              <div>SĐT: <strong className="text-dark">{defect.customerPhone || 'Không có'}</strong></div>
                              <div>Địa chỉ: <strong className="text-dark">{defect.customerAddress || 'Không có'}</strong></div>
                            </div>
                          </div>
                          <div className="ps-4">
                            <div className="mb-1">Đơn hàng: <strong className="text-dark">{defect.orderNumber || 'Không có'}</strong></div>
                            <div>Ngày giao/mua: <strong className="text-dark">{defect.purchaseDate ? new Date(defect.purchaseDate).toLocaleDateString() : 'Không có'}</strong></div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 p-md-4 d-flex flex-column flex-grow-1" style={{ minHeight: 0, overflowY: 'auto' }}>
                        <SectionTitle 
                          title="Bảng Thao tác" 
                          icon="bi-gear" 
                          className="mb-4 flex-shrink-0"
                          action={<span className="badge bg-dark rounded-pill px-3 py-2 fw-normal" style={{ fontSize: '12.5px', textTransform: 'none' }}>{STATUS_LABELS[defect.status] || defect.status}</span>}
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
