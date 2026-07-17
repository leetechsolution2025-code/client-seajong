import React from 'react';
import { DefectRecord, DefectStatus } from '../mockData';

const getStatusBadge = (status: DefectStatus) => {
  switch (status) {
    case 'NEW': return <span className="badge bg-primary">Chưa thực hiện</span>;
    case 'TECH_EVALUATING': return <span className="badge bg-info">Đang chẩn đoán</span>;
    case 'WAITING_APPROVAL': return <span className="badge bg-warning text-dark">Chờ duyệt</span>;
    case 'PROCESSING': return <span className="badge bg-secondary">Đang xử lý</span>;
    case 'COMPLETED': return <span className="badge bg-success">Hoàn tất</span>;
    default: return <span className="badge bg-light text-dark">{status}</span>;
  }
};

const getSourceIcon = (source: string) => {
  return source === 'INTERNAL' 
    ? <i className="bi bi-building text-danger me-2" title="Nội bộ"></i>
    : <i className="bi bi-shield-check text-primary me-2" title="Bảo hành"></i>;
};

interface DefectListProps {
  data: DefectRecord[];
  onSelect: (id: string) => void;
}

export function DefectList({ data, onSelect }: DefectListProps) {
  return (
    <div className="table-responsive small">
      <table className="table table-hover align-middle">
        <thead className="table-light text-secondary" style={{ fontSize: '13px' }}>
          <tr>
            <th style={{ width: '280px' }}>Mã lỗi</th>
            <th style={{ width: '250px' }}>Sản phẩm</th>
            <th>Mô tả hiện trạng</th>
            <th style={{ width: '180px' }}>Người báo cáo</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '13px' }}>
          {data && data.length > 0 ? data.map(defect => (
            <tr key={defect.id} onClick={() => onSelect(defect.id)} style={{ cursor: 'pointer' }}>
              <td>
                <div className="d-flex align-items-center">
                  {getSourceIcon(defect.source)}
                  <div>
                    <div className="fw-medium text-dark d-flex align-items-center gap-2">
                      {defect.code} 
                    </div>
                    <div className="text-muted d-flex align-items-center gap-2 mt-1" style={{ fontSize: '11px' }}>
                      <span>{new Date(defect.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {new Date(defect.createdAt).toLocaleDateString('vi-VN')}</span>
                      {getStatusBadge(defect.status)}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div className="fw-medium text-dark">{defect.productName}</div>
                <div className="text-muted small">{defect.productCode} - SL: {defect.quantity}</div>
              </td>
              <td style={{ maxWidth: '350px' }}>
                <div className="text-truncate text-muted small" title={defect.description}>
                  {defect.description}
                </div>
              </td>
              <td>
                <div className="text-dark">
                  {defect.reporterName} <span className="text-muted mx-1">|</span> {defect.reporterDepartment}
                </div>
                <div className="text-muted small">Phụ trách: {defect.assignedTo}</div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5} className="text-center py-5 text-muted">Chưa có hồ sơ lỗi nào.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
