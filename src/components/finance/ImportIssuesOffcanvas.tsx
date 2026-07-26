import React from "react";

interface SkippedItem {
  sku: string;
  name: string;
  reason: string;
}

export function ImportIssuesOffcanvas({ 
  show, 
  onClose, 
  skippedItems 
}: { 
  show: boolean; 
  onClose: () => void; 
  skippedItems: SkippedItem[]; 
}) {
  return (
    <>
      <div 
        className={`offcanvas offcanvas-end shadow-sm ${show ? "show" : ""}`} 
        style={{ width: "600px", visibility: show ? "visible" : "hidden", transition: "transform 0.3s ease-in-out" }}
        tabIndex={-1}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title d-flex align-items-center text-warning fw-bold">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Vấn đề phát sinh khi Import
          </h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>
        
        <div className="offcanvas-body p-0">
          <div className="p-3 bg-warning-soft text-warning small border-bottom">
            <i className="bi bi-info-circle me-1"></i>
            Đây là danh sách các mặt hàng đã <strong>bị bỏ qua</strong> do trùng lặp mã (SKU) hoặc gặp vấn đề khác. Hệ thống vẫn giữ nguyên các mặt hàng có sẵn trong kho.
          </div>
          
          {skippedItems.length === 0 ? (
            <div className="text-center p-5 text-muted">
              <i className="bi bi-check-circle fs-1 text-success mb-3 d-block"></i>
              Tuyệt vời! Không có vấn đề nào phát sinh.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-borderless mb-0 align-middle">
                <thead className="table-light text-muted small" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th className="ps-3 fw-medium">MÃ SKU</th>
                    <th className="fw-medium">TÊN HÀNG HOÁ</th>
                    <th className="pe-3 fw-medium">LÝ DO</th>
                  </tr>
                </thead>
                <tbody className="border-top">
                  {skippedItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="ps-3 py-3">
                        <span className="badge bg-light text-dark border font-monospace">
                          {item.sku}
                        </span>
                      </td>
                      <td className="py-3 text-truncate" style={{ maxWidth: 200 }}>
                        <span className="fw-medium text-dark">{item.name}</span>
                      </td>
                      <td className="pe-3 py-3">
                        <span className="text-danger small">{item.reason}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="offcanvas-header border-top d-flex justify-content-end bg-light">
          <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
      
      {show && (
        <div 
          className="offcanvas-backdrop fade show" 
          onClick={onClose}
          style={{ zIndex: 1040 }}
        ></div>
      )}
    </>
  );
}
