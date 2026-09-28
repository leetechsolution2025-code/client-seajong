import { DefectStatus } from '../mockData';
import { useState, useEffect } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BrandButton } from '@/components/ui/BrandButton';
import { Offcanvas } from '@/components/ui/Offcanvas';
import { useToast } from '@/components/ui/Toast';

const getStatusBadge = (status: DefectStatus | string) => {
  switch (status) {
    case 'NEW': return <span className="badge bg-primary">Chưa xử lý</span>;
    case 'TECH_EVALUATING': return <span className="badge bg-info">Đang chẩn đoán</span>;
    case 'WAITING_APPROVAL': return <span className="badge bg-warning text-dark">Chờ duyệt</span>;
    case 'PROCESSING': return <span className="badge bg-secondary">Đang xử lý</span>;
    case 'WAITING_INVENTORY': return <span className="badge bg-secondary">Đang thực hiện</span>;
    case 'COMPLETED': return <span className="badge bg-success">Đã xử lý</span>;
    default: return <span className="badge bg-light text-dark">{status || 'Chưa xử lý'}</span>;
  }
};

interface DefectSummaryOffcanvasProps {
  defectId: string | null;
  defect?: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenProcess?: () => void;
}

export function DefectSummaryOffcanvas({ defectId, defect: initialDefect, onClose, onRefresh, onOpenProcess }: DefectSummaryOffcanvasProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [fetchedDefect, setFetchedDefect] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    if (!defectId) {
      setFetchedDefect(null);
      return;
    }
    let isMounted = true;
    fetch(`/api/production/defects/${defectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setFetchedDefect(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [defectId]);

  const defect = fetchedDefect || initialDefect;

  const handleDelete = () => {
    if (!defect) return;
    setShowConfirmDelete(true);
  };
  
  const executeDelete = async () => {
    if (!defect) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/production/defects/${defect.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Thành công', 'Đã xoá hồ sơ thành công!');
        onClose();
        if (onRefresh) onRefresh();
      } else {
        toast.error('Lỗi', 'Xoá hồ sơ thất bại.');
      }
    } catch (err) {
      toast.error('Lỗi', 'Có lỗi xảy ra khi xoá hồ sơ.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const parsedMediaUrls: string[] = (() => {
    if (!defect?.mediaUrls) return [];
    if (Array.isArray(defect.mediaUrls)) return defect.mediaUrls;
    try {
      const parsed = JSON.parse(defect.mediaUrls);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return typeof defect.mediaUrls === 'string' && defect.mediaUrls.length > 2 ? [defect.mediaUrls] : [];
    }
  })();

  const getSourceLabel = (s: string) => {
    if (s === 'INTERNAL') return 'Nội bộ';
    if (s === 'WARRANTY') return 'Bảo hành';
    if (s === 'RETURN') return 'Hàng trả về';
    return s || 'Hàng trả về';
  };

  return (
    <>
      <Offcanvas
        show={!!defectId}
        onClose={onClose}
        title={
          defect?.source === 'RETURN'
            ? `Chi tiết hàng trả về: ${defect?.code || ''}`
            : `Chi tiết hồ sơ lỗi: ${defect?.code || ''}`
        }
        width="400px"
        bodyClassName="offcanvas-body d-flex flex-column p-0"
      >
        <div className="flex-grow-1 overflow-auto p-3" style={{ fontSize: '13px' }}>
          {defect ? (
            <div className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-1.5">
                  {getStatusBadge(defect.status)}
                  <span className="badge bg-light border text-dark fw-normal" style={{ fontSize: '11px' }}>
                    {getSourceLabel(defect.source)}
                  </span>
                </div>
                <span className="text-muted" style={{ fontSize: '11.5px' }}>
                  {defect.createdAt ? new Date(defect.createdAt).toLocaleString('vi-VN') : ''}
                </span>
              </div>

              <div>
                <div className="text-muted small">Sản phẩm</div>
                <div className="fw-bold text-primary" style={{ fontSize: '14px' }}>{defect.productName || 'Chưa xác định'}</div>
                <div className="text-muted mt-0.5">
                  Mã: <span className="fw-semibold text-dark">{defect.productCode || '—'}</span>
                  {defect.quantity !== undefined && (
                    <span className="ms-2">SL: <span className="text-danger fw-bold">{defect.quantity}</span></span>
                  )}
                </div>
                {defect.bomCode && (
                  <div className="text-muted mt-1" style={{ fontSize: '12px' }}>
                    Mã định mức: <span className="fw-medium text-dark">{defect.bomCode}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-light rounded border">
                <div className="text-muted small mb-1 fw-semibold">Mô tả lý do / Hiện trạng</div>
                <div className="fw-normal" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {defect.description?.split('\nNhận xét QC:')[0]?.trim() || defect.description || 'Không có mô tả'}
                </div>
              </div>

              {(defect.source === 'WARRANTY' || defect.source === 'RETURN' || defect.customerName || defect.orderNumber) && (
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-primary text-white py-2 d-flex align-items-center justify-content-between">
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>
                      <i className="bi bi-person me-2"></i>
                      {defect.source === 'RETURN' ? 'Thông tin trả về' : defect.source === 'WARRANTY' ? 'Thông tin bảo hành' : 'Thông tin khách hàng'}
                    </span>
                    {defect.orderNumber && (
                      <span className="badge bg-white text-primary fw-semibold" style={{ fontSize: '10.5px' }}>
                        ĐH: {defect.orderNumber}
                      </span>
                    )}
                  </div>
                  <div className="card-body py-2.5 px-3">
                    {defect.customerName && (
                      <div className="mb-2">
                        <div className="text-muted small">Khách hàng</div>
                        <div className="fw-semibold text-dark">
                          {defect.customerName} {defect.customerPhone ? `(${defect.customerPhone})` : ''}
                        </div>
                      </div>
                    )}
                    {defect.customerAddress && (
                      <div className="mb-2">
                        <div className="text-muted small">Địa chỉ</div>
                        <div className="text-dark">{defect.customerAddress}</div>
                      </div>
                    )}
                    {defect.orderNumber && (
                      <div className="mb-2">
                        <div className="text-muted small">Đơn hàng gốc</div>
                        <div className="text-dark fw-medium">{defect.orderNumber}</div>
                      </div>
                    )}
                    {defect.purchaseDate && (
                      <div>
                        <div className="text-muted small">Ngày giao / mua hàng</div>
                        <div className="text-dark">{new Date(defect.purchaseDate).toLocaleDateString('vi-VN')}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {defect.source === 'INTERNAL' && (
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-danger text-white py-2">
                    <i className="bi bi-building me-2"></i>Thông tin nội bộ
                  </div>
                  <div className="card-body py-2.5 px-3">
                    <div className="mb-2">
                      <div className="text-muted small">Bộ phận / Người phát hiện</div>
                      <div className="fw-medium">
                        {defect.reporterName} - {(() => {
                          const dept = (defect.reporterDepartment || '').toLowerCase();
                          if (dept === 'qa') return 'Quản lý Chất lượng (QA)';
                          if (dept === 'production') return 'Sản xuất';
                          if (dept === 'logistics') return 'Kho vận';
                          if (dept === 'sales') return 'Kinh doanh';
                          if (dept === 'customer_service') return 'CSKH';
                          return defect.reporterDepartment || 'Khác';
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted small">Trách nhiệm xử lý hiện tại</div>
                      <div className="fw-medium">{defect.assignedTo || 'Chưa phân công'}</div>
                    </div>
                  </div>
                </div>
              )}

              {parsedMediaUrls.length > 0 && (
                <div>
                  <div className="text-muted small mb-2 fw-semibold">Hình ảnh / Video đính kèm</div>
                  <div className="d-flex flex-wrap gap-2">
                    {parsedMediaUrls.map((url: string, idx: number) => {
                      const isVideo = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm');
                      return (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="d-block position-relative rounded border overflow-hidden bg-dark" style={{ width: '80px', height: '80px' }}>
                          {isVideo ? (
                            <>
                              <video src={url} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                              <div className="position-absolute top-50 start-50 translate-middle text-white bg-dark bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                                <i className="bi bi-play-fill fs-5"></i>
                              </div>
                            </>
                          ) : (
                            <img src={url} alt="Lỗi" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted mt-5">Đang tải dữ liệu...</div>
          )}
        </div>
        
        {/* Footer */}
        {defect && (
          <div className="border-top p-3 bg-light d-flex justify-content-between align-items-center mt-auto">
            <BrandButton 
              variant="outline-danger"
              icon="bi-trash"
              onClick={handleDelete}
              disabled={isDeleting}
              loading={isDeleting}
            >
              {isDeleting ? 'Đang xoá...' : 'Xoá'}
            </BrandButton>
            <div className="d-flex align-items-center gap-2">
              {onOpenProcess && (
                <BrandButton 
                  variant="primary"
                  disabled={defect.status === 'COMPLETED'}
                  onClick={onOpenProcess}
                >
                  Tiến trình xử lý <i className="bi bi-arrow-right ms-1"></i>
                </BrandButton>
              )}
              <button 
                type="button" 
                className="btn btn-outline-secondary px-3"
                style={{ height: 36, fontSize: 13, borderRadius: 8 }}
                onClick={onClose}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Offcanvas>

      <ConfirmDialog
        open={showConfirmDelete}
        title="Xoá hồ sơ lỗi / trả về"
        message={`Bạn có chắc chắn muốn xoá hồ sơ "${defect?.code || ''}" này không? Toàn bộ tập tin đính kèm liên quan cũng sẽ bị xoá. Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        loading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  );
}
