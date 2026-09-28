"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { DefectStatus } from "../mockData";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { BrandButton } from "@/components/ui/BrandButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới',
  TECH_EVALUATING: 'Đang chẩn đoán',
  WAITING_APPROVAL: 'Chờ duyệt',
  WAITING_INVENTORY: 'Chờ kho',
  PROCESSING: 'Đang xử lý',
  WAITING_QC: 'Chờ QC kiểm tra',
  COMPLETED: 'Hoàn tất'
};

interface DefectProcessModalProps {
  defectId: string | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export function DefectProcessModal({ defectId, onClose, onRefresh }: DefectProcessModalProps) {
  const { data: session } = useSession();
  const { data: defect, mutate } = useSWR(defectId ? `/api/production/defects/${defectId}` : null, fetcher);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('Sửa chữa tại chỗ');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [selectedBomItemIds, setSelectedBomItemIds] = useState<Set<string>>(new Set());
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});
  const [returnQty, setReturnQty] = useState<number>(1);
  const isBomLocked = defect?.status !== 'NEW' && defect?.status !== 'TECH_EVALUATING';
  const toast = useToast();

  const prevDefectId = React.useRef<string | null>(null);

  useEffect(() => {
    if (defect && defect.id && defect.id !== prevDefectId.current) {
      prevDefectId.current = defect.id;
      setNote(defect.repairPlan || '');
      if (defect.resolution) {
        setResolution(defect.resolution);
      }
      if (Array.isArray(defect.selectedBomItemIds) && defect.selectedBomItemIds.length > 0) {
        setSelectedBomItemIds(new Set(defect.selectedBomItemIds));
      } else {
        setSelectedBomItemIds(new Set());
      }
      if (defect.editedQuantities && Object.keys(defect.editedQuantities).length > 0) {
        setEditedQuantities(defect.editedQuantities);
      } else {
        setEditedQuantities({});
      }
    }
  }, [defect]);

  useEffect(() => {
    if (defect?.quantity) {
      setReturnQty(Number(defect.quantity) || 1);
    }
  }, [defect?.quantity]);

  useEffect(() => {
    if ((defect?.status === 'NEW' || defect?.status === 'TECH_EVALUATING') && selectedBomItemIds.size === 0 && (resolution === 'Thay linh kiện' || resolution === 'Phân rã thu hồi vật tư linh kiện')) {
      setResolution('Sửa chữa tại chỗ');
    }
  }, [selectedBomItemIds.size, resolution, defect?.status]);

  if (!defectId) return null;

  const handleProcess = async (action: string, nextStatus: string, bomUpdates?: any[], customReturnQty?: number) => {
    const finalNote = note || defect?.repairPlan || (action === 'TIẾP TỤC XỬ LÝ' || action === 'NHẬN LINH KIỆN & XỬ LÝ' ? 'Tiếp tục xử lý sau khi kho xuất vật tư' : (action === 'HOÀN THÀNH' ? 'Hoàn tất xử lý và chuyển QC kiểm tra' : ''));
    if (!finalNote && action !== 'ĐÓNG HỒ SƠ' && action !== 'HOÀN THÀNH') {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập báo cáo nội dung xử lý!');
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
          note: finalNote,
          performedBy: session?.user?.name || 'Hệ thống',
          bomUpdates,
          returnQty: customReturnQty ?? returnQty
        })
      });
      
      if (res.ok) {
        toast.success('Thành công', 'Đã lưu quyết định xử lý!');
        mutate();
        if (onRefresh) onRefresh();
      } else {
        toast.error('Thất bại', 'Có lỗi xảy ra trong quá trình xử lý!');
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ!');
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
                            <div>Số lượng: <strong className="text-danger">{String(defect.quantity || 0).padStart(2, '0')}</strong></div>
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
                              action={<span className={`badge ${defect.bomCode ? "bg-primary" : "bg-danger"} text-white border-0 fw-normal`} style={{ textTransform: 'none' }}>{defect.bomCode || 'Không có định mức'}</span>}
                            />
                          }
                          table={
                            <table className="table table-hover align-middle table-sm mb-0" style={{ '--bs-table-border-color': 'rgba(0,0,0,0.05)' } as React.CSSProperties}>
                              <thead className="text-muted small" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                <tr>
                                  <th style={{ width: '40px', borderBottomWidth: 1 }} className="text-center align-middle py-3">
                                    <input 
                                      type="checkbox" 
                                      className={`form-check-input shadow-none ${isBomLocked ? '' : 'cursor-pointer'}`}
                                      checked={defect?.bomItems?.length > 0 && selectedBomItemIds.size === defect.bomItems.length}
                                      disabled={isBomLocked}
                                      onChange={(e) => {
                                        if (isBomLocked) return;
                                        if (e.target.checked && defect?.bomItems) {
                                          setSelectedBomItemIds(new Set(defect.bomItems.map((i: any) => i.id)));
                                        } else {
                                          setSelectedBomItemIds(new Set());
                                        }
                                      }}
                                    />
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
                                     <tr 
                                       key={item.id} 
                                       className={isBomLocked ? "" : "cursor-pointer"}
                                       onClick={() => {
                                         if (isBomLocked) return;
                                         const next = new Set(selectedBomItemIds);
                                         if (next.has(item.id)) next.delete(item.id);
                                         else next.add(item.id);
                                         setSelectedBomItemIds(next);
                                       }}
                                     >
                                       <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                         <input 
                                           type="checkbox" 
                                           className={`form-check-input shadow-none ${isBomLocked ? '' : 'cursor-pointer'}`} 
                                           checked={selectedBomItemIds.has(item.id)}
                                           disabled={isBomLocked}
                                           onChange={(e) => {
                                             if (isBomLocked) return;
                                             const next = new Set(selectedBomItemIds);
                                             if (e.target.checked) next.add(item.id);
                                             else next.delete(item.id);
                                             setSelectedBomItemIds(next);
                                           }}
                                         />
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
                          action={
                            (defect.status === 'NEW' || defect.status === 'TECH_EVALUATING') ? (
                              <BrandButton 
                                className="rounded-2 px-4 shadow-sm"
                                icon="bi-check2-circle"
                                disabled={isSubmitting} 
                                onClick={() => {
                                  if (!note) {
                                    toast.warning('Thiếu thông tin', 'Vui lòng nhập báo cáo nội dung xử lý!');
                                    return;
                                  }
                                  if (resolution === 'Thay linh kiện' || resolution === 'Phân rã thu hồi vật tư linh kiện') {
                                    const initial: Record<string, number> = {};
                                    if (defect?.bomItems) {
                                      defect.bomItems.forEach((i: any) => {
                                        if (selectedBomItemIds.has(i.id)) {
                                          initial[i.id] = i.qty;
                                        }
                                      });
                                    }
                                    setEditedQuantities(initial);
                                    setShowOffcanvas(true);
                                  } else {
                                    setShowConfirm(true);
                                  }
                                }}
                              >
                                {isSubmitting ? 'Đang xử lý...' : 'Xử lý lỗi'}
                              </BrandButton>
                            ) : (
                              <span className="badge bg-dark rounded-pill px-3 py-2 fw-normal" style={{ fontSize: '12.5px', textTransform: 'none' }}>{STATUS_LABELS[defect.status] || defect.status}</span>
                            )
                          }
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
                              <label className="form-label small fw-medium text-muted mb-3">
                                Báo cáo nội dung xử lý {defect.status !== 'WAITING_QC' && defect.status !== 'COMPLETED' && <span className="text-danger">*</span>}
                                {defect.status === 'WAITING_QC' && (
                                  <span className="badge bg-info-subtle text-info-emphasis border border-info ms-2 fw-normal" style={{ fontSize: '11px' }}>
                                    <i className="bi bi-send me-1"></i>Đã chuyển QC
                                  </span>
                                )}
                              </label>
                              <textarea 
                                className="form-control form-control-sm rounded-3 shadow-none flex-grow-1 border-opacity-50" 
                                placeholder="Nhập chi tiết về tình trạng lỗi và hướng xử lý..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                readOnly={defect.status === 'WAITING_QC' || defect.status === 'COMPLETED'}
                                style={{ minHeight: '200px' }}
                              ></textarea>
                            </div>
                          </div>

                          <div className="col-md-6">
                            {(defect.status === 'NEW' || defect.status === 'TECH_EVALUATING') && (
                              <div className="d-flex flex-column h-100">
                                <label className="form-label small fw-medium text-muted mb-3">Chọn phương án (Cấp độ xử lý) <span className="text-danger">*</span></label>
                                
                                <div className="d-flex flex-column gap-2 h-100">
                                  {[
                                    { title: 'Sửa chữa tại chỗ', description: 'Không cần thông báo thông tin (Kỹ thuật xử lý tại chỗ)' },
                                    { title: 'Thay linh kiện', description: 'Cấp phát linh kiện thay thế từ kho KVP' },
                                    { title: 'Phân rã thu hồi vật tư linh kiện', description: 'Nhập kho thu hồi vật tư linh kiện vào kho KVP' },
                                    { title: 'Huỷ bỏ thay thế bằng hàng hoá mới', description: 'Nhập kho hàng lỗi (KHO-LOI) & Cấp mới thành phẩm' },
                                    { title: 'Nhập lại kho', description: 'Nhập kho hàng trả lại vào Kho hàng lỗi (KHO-LOI)' }
                                  ].map((opt, idx) => {
                                    const isDisabled = selectedBomItemIds.size === 0 && (opt.title === 'Thay linh kiện' || opt.title === 'Phân rã thu hồi vật tư linh kiện');
                                    return (
                                      <div key={opt.title} className="form-check p-0 m-0">
                                        <input 
                                          type="radio" 
                                          className="btn-check" 
                                          name="resolutionOptions" 
                                          id={`res-${idx}`} 
                                          autoComplete="off" 
                                          checked={resolution === opt.title}
                                          onChange={() => setResolution(opt.title)}
                                          disabled={isDisabled}
                                        />
                                        <label 
                                          className={`btn btn-outline-primary w-100 text-start py-2 px-3 rounded-3 shadow-sm h-100 d-flex flex-column justify-content-center ${isDisabled ? 'opacity-50' : ''}`} 
                                          htmlFor={`res-${idx}`}
                                          style={isDisabled ? { cursor: 'not-allowed' } : {}}
                                        >
                                          <div className="d-flex align-items-center mb-1" style={{ fontSize: '13px' }}>
                                            <span className="fw-bold me-1">Mức {idx + 1}:</span> 
                                            <span className="fw-medium">{opt.title}</span>
                                          </div>
                                          <div className="opacity-75" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: 1.2 }}>
                                            {opt.description}
                                          </div>
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>

                                {resolution === 'Nhập lại kho' && (
                                  <div className="p-3 bg-light border border-primary border-opacity-25 rounded-3 mt-2">
                                    <div className="d-flex align-items-center justify-content-between">
                                      <div>
                                        <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                                          <i className="bi bi-box-arrow-in-down text-primary me-1"></i> Số lượng nhập kho hàng trả lại:
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '11px' }}>
                                          Khách trả: {defect?.quantity || 1} bộ sản phẩm
                                        </div>
                                      </div>
                                      <div className="d-flex align-items-center gap-1">
                                        <input 
                                          type="number" 
                                          className="form-control form-control-sm text-center fw-bold text-primary" 
                                          style={{ width: '80px', fontSize: '13px' }}
                                          min={1} 
                                          max={defect?.quantity || 1}
                                          value={returnQty}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value) || 1;
                                            const max = defect?.quantity ? Number(defect.quantity) : 1;
                                            setReturnQty(Math.min(max, Math.max(1, val)));
                                          }}
                                        />
                                        <span className="text-muted small">Bộ</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {defect.status === 'WAITING_INVENTORY' && (() => {
                              const currentRes = resolution || defect.resolution;
                              const isReturnResolution = (currentRes === 'Nhập lại kho');
                              const isRecallResolution = (currentRes === 'Phân rã thu hồi vật tư linh kiện');
                              const isScrapResolution = (currentRes === 'Huỷ bỏ thay thế bằng hàng hoá mới');
                              const isImportResolution = isReturnResolution || isRecallResolution || isScrapResolution;

                              if (isImportResolution) {
                                const isImportCompleted = defect.warehouseTask?.status === 'done' || defect.warehouseTask?.status === 'completed';
                                const importTypeName = isReturnResolution 
                                  ? 'Nhập kho hàng trả lại' 
                                  : (isRecallResolution ? 'Nhập kho thu hồi' : 'Nhập kho hàng lỗi');
                                const whName = isRecallResolution ? 'Kho Vật tư Phụ kiện (KVP)' : 'Kho hàng lỗi (KHO-LOI)';

                                return (
                                  <div className="d-flex flex-column h-100 justify-content-center gap-3">
                                    <div className="p-3 bg-light rounded-3 border">
                                      <div className="d-flex align-items-center justify-content-between mb-2">
                                        <span className="small text-muted">Phương án xử lý:</span>
                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                          {currentRes} ({importTypeName})
                                        </span>
                                      </div>
                                      <div className="d-flex align-items-center justify-content-between small text-muted">
                                        <span>Lệnh {importTypeName.toLowerCase()}:</span>
                                        <div className="d-flex align-items-center gap-1">
                                          <span className={`badge ${isImportCompleted ? 'bg-success-subtle text-success border border-success' : 'bg-warning-subtle text-warning-emphasis border border-warning'}`}>
                                            {defect.warehouseTask?.title || `Yêu cầu ${importTypeName.toLowerCase()} (${defect.code})`} {isImportCompleted ? '• Đã nhập kho' : '• Chờ kho nhập'}
                                          </span>
                                          <button
                                            type="button"
                                            className="btn btn-link btn-sm p-0 text-muted"
                                            title="Kiểm tra lại trạng thái nhập kho"
                                            onClick={() => mutate()}
                                          >
                                            <i className="bi bi-arrow-clockwise"></i>
                                          </button>
                                        </div>
                                      </div>
                                      {!isImportCompleted ? (
                                        <div className="mt-2 pt-2 border-top small text-muted d-flex align-items-center gap-2">
                                          <i className="bi bi-lock-fill text-warning fs-6"></i>
                                          <span>Nút <strong>{isReturnResolution ? 'Hoàn thành' : 'Tiếp tục xử lý'}</strong> chỉ mở khoá khi bộ phận kho hoàn tất lập phiếu {importTypeName.toLowerCase()} ({whName}).</span>
                                        </div>
                                      ) : (
                                        <div className="mt-2 pt-2 border-top small text-success d-flex align-items-center gap-2">
                                          <i className="bi bi-check-circle-fill fs-6"></i>
                                          <span>Đã hoàn tất {importTypeName.toLowerCase()} vào {whName}. Bạn có thể tiếp tục.</span>
                                        </div>
                                      )}
                                    </div>
                                    <button 
                                      className={`btn ${isImportCompleted ? (isReturnResolution ? 'btn-success' : 'btn-primary') : 'btn-secondary'} fw-bold rounded-pill shadow-sm py-2`} 
                                      disabled={!isImportCompleted || isSubmitting} 
                                      onClick={() => isReturnResolution ? handleProcess('HOÀN THÀNH', 'COMPLETED') : handleProcess('TIẾP TỤC XỬ LÝ', 'PROCESSING')}
                                      title={!isImportCompleted ? `Chỉ mở khoá khi hoàn tất ${importTypeName.toLowerCase()}` : (isReturnResolution ? 'Hoàn thành hồ sơ' : 'Tiếp tục xử lý')}
                                    >
                                      {!isImportCompleted ? (
                                        <>
                                          <i className="bi bi-lock-fill me-1"></i> {isReturnResolution ? 'Hoàn thành' : 'Tiếp tục xử lý'}
                                        </>
                                      ) : (
                                        <>
                                          <i className={`bi ${isReturnResolution ? 'bi-check2-circle' : 'bi-arrow-right-circle'} me-1`}></i> {isReturnResolution ? 'Hoàn thành hồ sơ' : 'Tiếp tục xử lý'}
                                        </>
                                      )}
                                    </button>
                                  </div>
                                );
                              }

                              const materialTickets = (defect.logisticsTickets || []).filter((t: any) => t.type === 'WARRANTY_MATERIAL');
                              const ticketsToCheck = materialTickets.length > 0 ? materialTickets : (defect.logisticsTickets || []);
                              const mainTicket = ticketsToCheck[0];
                              const hasTicket = ticketsToCheck.length > 0;
                              const isExportCompleted = hasTicket && ticketsToCheck.every((t: any) => t.status === 'COMPLETED');

                              return (
                                <div className="d-flex flex-column h-100 justify-content-center gap-3">
                                  <div className="p-3 bg-light rounded-3 border">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <span className="small text-muted">Phương án xử lý:</span>
                                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                        {resolution || defect.resolution || 'Thay linh kiện'}
                                      </span>
                                    </div>
                                    {mainTicket ? (
                                      <div className="d-flex align-items-center justify-content-between small text-muted">
                                        <span>Lệnh cấp phát linh kiện:</span>
                                        <div className="d-flex align-items-center gap-1">
                                          <span className={`badge ${isExportCompleted ? 'bg-success-subtle text-success border border-success' : 'bg-warning-subtle text-warning-emphasis border border-warning'}`}>
                                            {mainTicket.code} {isExportCompleted ? '• Đã cấp phát' : '• Chờ kho cấp phát'}
                                          </span>
                                          <button
                                            type="button"
                                            className="btn btn-link btn-sm p-0 text-muted"
                                            title="Kiểm tra lại trạng thái xuất kho"
                                            onClick={() => mutate()}
                                          >
                                            <i className="bi bi-arrow-clockwise"></i>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="small text-danger">
                                        Chưa có lệnh cấp phát vật tư
                                      </div>
                                    )}
                                    {!isExportCompleted ? (
                                      <div className="mt-2 pt-2 border-top small text-muted d-flex align-items-center gap-2">
                                        <i className="bi bi-lock-fill text-warning fs-6"></i>
                                        <span>Nút <strong>Tiếp tục xử lý</strong> chỉ mở khoá khi bộ phận kho hoàn tất lệnh xuất kho vật tư.</span>
                                      </div>
                                    ) : (
                                      <div className="mt-2 pt-2 border-top small text-success d-flex align-items-center gap-2">
                                        <i className="bi bi-check-circle-fill fs-6"></i>
                                        <span>Đã hoàn tất lệnh xuất kho vật tư. Bạn có thể tiếp tục xử lý hồ sơ.</span>
                                      </div>
                                    )}
                                  </div>
                                  <button 
                                    className={`btn ${isExportCompleted ? 'btn-primary' : 'btn-secondary'} fw-bold rounded-pill shadow-sm py-2`} 
                                    disabled={!isExportCompleted || isSubmitting} 
                                    onClick={() => handleProcess('TIẾP TỤC XỬ LÝ', 'PROCESSING')}
                                    title={!isExportCompleted ? 'Chỉ mở khoá khi hoàn tất lệnh xuất kho vật tư' : 'Tiếp tục xử lý'}
                                  >
                                    {!isExportCompleted ? (
                                      <>
                                        <i className="bi bi-lock-fill me-1"></i> Tiếp tục xử lý
                                      </>
                                    ) : (
                                      <>
                                        <i className="bi bi-arrow-right-circle me-1"></i> Tiếp tục xử lý
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })()}

                            {defect.status === 'PROCESSING' && (
                              <div className="d-flex flex-column h-100 justify-content-center gap-3">
                                <div className="p-3 bg-light rounded-3 border">
                                  <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="small text-muted">Phương án xử lý:</span>
                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                      {resolution || defect.resolution || 'Thay linh kiện'}
                                    </span>
                                  </div>
                                  <div className="d-flex align-items-center justify-content-between small text-muted">
                                    <span>Bước tiếp theo:</span>
                                    <span className="fw-semibold text-dark">
                                      Chuyển thông tin sang bộ phận QC
                                    </span>
                                  </div>
                                  <div className="mt-2 pt-2 border-top small text-muted d-flex align-items-center gap-2">
                                    <i className="bi bi-info-circle text-primary fs-6"></i>
                                    <span>Sau khi hoàn tất sửa chữa, nhấn <strong>Hoàn thành</strong> để chuyển thông tin sang bộ phận QC kiểm tra chất lượng xuất xưởng (OQC).</span>
                                  </div>
                                </div>
                                <button 
                                  className="btn btn-primary fw-bold rounded-pill shadow-sm py-2 d-flex align-items-center justify-content-center gap-2" 
                                  disabled={isSubmitting} 
                                  onClick={() => handleProcess('HOÀN THÀNH', 'WAITING_QC')}
                                  title="Nhấn Hoàn thành để kết thúc xử lý tại xưởng sản xuất và bàn giao sang bộ phận QC kiểm định"
                                >
                                  <i className="bi bi-check2-circle fs-5"></i>
                                  <span>Hoàn thành</span>
                                </button>
                              </div>
                            )}

                            {defect.status === 'WAITING_QC' && (
                              <div className="d-flex flex-column h-100 justify-content-center gap-3">
                                <div className="p-3 bg-light rounded-3 border">
                                  <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="small text-muted">Trạng thái kiểm định:</span>
                                    <span className="badge bg-info-subtle text-info-emphasis border border-info px-2 py-1">
                                      <i className="bi bi-hourglass-split me-1"></i> Chờ QC kiểm tra
                                    </span>
                                  </div>
                                  {defect.qcInspection ? (
                                    <div className="d-flex align-items-center justify-content-between small text-muted mb-2">
                                      <span>Phiếu kiểm tra OQC:</span>
                                      <div className="d-flex align-items-center gap-1">
                                        <span className="fw-semibold text-dark">
                                          {defect.qcInspection.code}
                                        </span>
                                        <span className={`badge ${defect.qcInspection.status === 'Đã hoàn thành' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'}`}>
                                          {defect.qcInspection.status}
                                        </span>
                                        <button
                                          type="button"
                                          className="btn btn-link btn-sm p-0 text-muted ms-1"
                                          title="Kiểm tra lại trạng thái QC"
                                          onClick={() => mutate()}
                                        >
                                          <i className="bi bi-arrow-clockwise"></i>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="small text-muted mb-2">
                                      Đã tạo yêu cầu và thông báo đến bộ phận QC.
                                    </div>
                                  )}
                                  <div className="mt-2 pt-2 border-top small text-muted d-flex align-items-center gap-2">
                                    <i className="bi bi-shield-check text-info fs-6"></i>
                                    <span>Bộ phận QC sẽ tiến hành kiểm định tại <strong>Phân hệ Quản lý chất lượng</strong>. Khi QC kết luận ĐẠT, hệ thống sẽ tự động phát sinh lệnh nhập kho thành phẩm (KHO-CHINH) để kết thúc quy trình.</span>
                                  </div>
                                </div>

                                <div className="d-flex">
                                  <button 
                                    type="button"
                                    className="btn btn-outline-secondary w-100 rounded-pill py-2 small fw-semibold"
                                    onClick={onClose}
                                  >
                                    <i className="bi bi-x-lg me-1"></i> Đóng
                                  </button>
                                </div>
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

      <div className={`offcanvas offcanvas-end shadow ${showOffcanvas ? "show" : ""}`} tabIndex={-1} style={{ visibility: showOffcanvas ? "visible" : "hidden", width: "400px", zIndex: 1060, transition: "transform 0.3s ease-in-out" }}>
        <div className="offcanvas-header border-bottom bg-light py-3">
          <h6 className="offcanvas-title fw-bold text-dark">
            {resolution === 'Thay linh kiện' ? 'Vật tư cấp phát thay thế' : 'Vật tư thu hồi'}
          </h6>
          <button type="button" className="btn-close shadow-none" onClick={() => setShowOffcanvas(false)}></button>
        </div>
        <div className="offcanvas-body p-3 overflow-auto bg-light">
          <div className="mb-3 small text-muted">
            Danh sách vật tư được chọn để {resolution === 'Thay linh kiện' ? 'cấp phát mới' : 'thu hồi về kho'}. Bạn có thể điều chỉnh số lượng nếu cần thiết.
          </div>
          
          <div className="table-responsive border rounded-3 bg-white shadow-sm">
            <table className="table table-hover align-middle table-sm mb-0" style={{ fontSize: '13px' }}>
              <thead className="bg-light text-muted">
                <tr>
                  <th className="fw-medium py-2 px-3 border-bottom">Tên vật tư</th>
                  <th className="fw-medium py-2 px-3 border-bottom text-end" style={{ width: '90px' }}>Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {defect?.bomItems?.filter((item: any) => selectedBomItemIds.has(item.id)).map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-2 px-3">
                      <div className="fw-bold text-dark">{item.name}</div>
                      <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                        {item.id} - Tồn: <strong className={item.stock > 0 ? "text-success" : "text-danger"}>{item.stock}</strong> {item.unit}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-end">
                      <input 
                        type="number" 
                        className="form-control form-control-sm text-center fw-bold text-primary px-1" 
                        value={editedQuantities[item.id] || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setEditedQuantities(prev => ({...prev, [item.id]: val}));
                        }}
                        min={1}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="offcanvas-footer p-3 border-top bg-white mt-auto">
          <BrandButton 
            className="w-100 rounded-2 py-2" 
            disabled={isSubmitting}
            onClick={() => {
              setShowOffcanvas(false);
              const nextStatus = 'WAITING_INVENTORY';
              const bomPayload = defect?.bomItems
                ?.filter((item: any) => selectedBomItemIds.has(item.id))
                .map((item: any) => ({
                  id: item.id,
                  inventoryItemId: item.realInventoryItemId,
                  name: item.name,
                  code: item.id, // using id as code for now
                  unit: item.unit,
                  quantity: editedQuantities[item.id] || 0
                }));
              handleProcess(`QUYẾT ĐỊNH: ${resolution.toUpperCase()}`, nextStatus, bomPayload);
            }}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Tạo yêu cầu'}
          </BrandButton>
        </div>
      </div>
      {showOffcanvas && <div className="modal-backdrop fade show" style={{ zIndex: 1055 }} onClick={() => setShowOffcanvas(false)}></div>}

      <ConfirmDialog 
        open={showConfirm}
        title="Xác nhận xử lý lỗi"
        message={
          <div>
            <p className="mb-2">Bạn có chắc chắn muốn thực hiện xử lý lỗi với phương án <strong>{resolution}</strong>?</p>
            {resolution === 'Nhập lại kho' && (
              <p className="mb-0 text-primary small fw-semibold">
                <i className="bi bi-box-arrow-in-down me-1"></i> Số lượng nhập kho hàng trả lại: <strong>{returnQty}</strong> bộ
              </p>
            )}
          </div>
        }
        confirmLabel="Xác nhận xử lý"
        cancelLabel="Đóng"
        variant="warning"
        loading={isSubmitting}
        onConfirm={() => {
          setShowConfirm(false);
          const nextStatus = (resolution === 'Thay linh kiện' || resolution === 'Huỷ bỏ thay thế bằng hàng hoá mới' || resolution === 'Nhập lại kho') 
            ? 'WAITING_INVENTORY' 
            : (resolution === 'Sửa chữa tại chỗ' ? 'COMPLETED' : 'PROCESSING');
          handleProcess(`QUYẾT ĐỊNH: ${resolution.toUpperCase()}`, nextStatus, undefined, returnQty);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
