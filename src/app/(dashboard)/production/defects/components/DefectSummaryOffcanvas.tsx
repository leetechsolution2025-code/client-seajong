import { DefectStatus } from '../mockData';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BrandButton } from '@/components/ui/BrandButton';
import { Offcanvas } from '@/components/ui/Offcanvas';

const getStatusBadge = (status: DefectStatus) => {
  switch (status) {
    case 'NEW': return <span className="badge bg-primary">Mới</span>;
    case 'TECH_EVALUATING': return <span className="badge bg-info">Đang chẩn đoán</span>;
    case 'WAITING_APPROVAL': return <span className="badge bg-warning text-dark">Chờ duyệt</span>;
    case 'PROCESSING': return <span className="badge bg-secondary">Đang xử lý</span>;
    case 'COMPLETED': return <span className="badge bg-success">Hoàn tất</span>;
    default: return <span className="badge bg-light text-dark">{status}</span>;
  }
};

interface DefectSummaryOffcanvasProps {
  defectId: string | null;
  defect: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenProcess?: () => void;
}

export function DefectSummaryOffcanvas({ defectId, defect, onClose, onRefresh, onOpenProcess }: DefectSummaryOffcanvasProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!defect) return;
    setShowConfirmDelete(true);
    return;
  }
  
  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/production/defects/${defect.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onClose();
        if (onRefresh) onRefresh();
      } else {
        alert('Xoá thất bại');
      }
    } catch (err) {
      alert('Có lỗi xảy ra');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };


  // const defect = defectId ? MOCK_DEFECTS.find(d => d.id === defectId) : null;

  return (
    <>
      <Offcanvas
        show={!!defectId}
        onClose={onClose}
        title={`Chi tiết lỗi: ${defect?.code}`}
        width="400px"
        bodyClassName="offcanvas-body d-flex flex-column p-0"
      >
        <div className="flex-grow-1 overflow-auto p-3" style={{ fontSize: '13px' }}>
          {defect ? (
            <div className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-center">
                {getStatusBadge(defect.status)}
                <span className="text-muted">{new Date(defect.createdAt).toLocaleString('vi-VN')}</span>
              </div>

              <div>
                <div className="text-muted small">Sản phẩm</div>
                <div className="fw-bold text-primary">{defect.productName}</div>
                <div className="text-muted">{defect.productCode} - SL: <span className="text-danger fw-bold">{defect.quantity}</span></div>
                <div className="text-muted mt-1" style={{ fontSize: '13px' }}>
                  Mã định mức: <span className="fw-medium text-dark">{defect.bomCode || "Không có định mức"}</span>
                </div>
              </div>

              <div className="p-3 bg-light rounded border">
                <div className="text-muted small mb-1">Mô tả hiện trạng</div>
                <div className="fw-medium" style={{ whiteSpace: 'pre-wrap' }}>
                  {defect.description?.split('\nNhận xét QC:')[0]?.trim() || defect.description}
                </div>
              </div>

              {defect.source === 'WARRANTY' && (
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-primary text-white py-2">
                    <i className="bi bi-person me-2"></i>Thông tin bảo hành
                  </div>
                  <div className="card-body">
                    <div className="mb-2">
                      <div className="text-muted small">Khách hàng</div>
                      <div className="fw-medium">{defect.customerName} - {defect.customerPhone}</div>
                    </div>
                    <div className="mb-2">
                      <div className="text-muted small">Địa chỉ</div>
                      <div className="fw-medium">{defect.customerAddress}</div>
                    </div>
                    <div>
                      <div className="text-muted small">Ngày giao hàng / Mua hàng</div>
                      <div className="fw-medium">{defect.purchaseDate ? new Date(defect.purchaseDate).toLocaleDateString('vi-VN') : 'Không rõ'}</div>
                    </div>
                  </div>
                </div>
              )}

              {defect.source === 'INTERNAL' && (
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-danger text-white py-2">
                    <i className="bi bi-building me-2"></i>Thông tin nội bộ
                  </div>
                  <div className="card-body">
                    <div className="mb-2">
                      <div className="text-muted small">Bộ phận / Người phát hiện</div>
                      <div className="fw-medium">
                        {defect.reporterName} - {(() => {
                          const dept = (defect.reporterDepartment || "").toLowerCase();
                          if (dept === "qa") return "Quản lý Chất lượng (QA)";
                          if (dept === "production") return "Sản xuất";
                          if (dept === "logistics") return "Kho vận";
                          if (dept === "sales") return "Kinh doanh";
                          if (dept === "customer_service") return "CSKH";
                          return defect.reporterDepartment || "Khác";
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

              {defect.mediaUrls && defect.mediaUrls.length > 0 && (
                <div>
                  <div className="text-muted small mb-2">Hình ảnh / Video đính kèm</div>
                  <div className="d-flex flex-wrap gap-2">
                    {defect.mediaUrls.map((url: string, idx: number) => {
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
          <div className="border-top p-3 bg-light d-flex justify-content-between mt-auto">
            <BrandButton 
              variant="outline-danger"
              icon="bi-trash"
              onClick={handleDelete}
              disabled={isDeleting}
              loading={isDeleting}
            >
              {isDeleting ? 'Đang xoá...' : 'Xoá'}
            </BrandButton>
            <BrandButton 
              variant="primary"
              disabled={defect.status === 'COMPLETED'}
              onClick={onOpenProcess}
            >
              Tiến trình xử lý <i className="bi bi-arrow-right ms-1"></i>
            </BrandButton>
          </div>
        )}
      </Offcanvas>

      <ConfirmDialog
        open={showConfirmDelete}
        title="Xoá hồ sơ lỗi"
        message="Bạn có chắc chắn muốn xoá hồ sơ lỗi này và toàn bộ tập tin đính kèm? Hành động này không thể hoàn tác."
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        loading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  );
}
