import React, { useState, useEffect } from "react";

export function MissingMaterialsOffcanvas({ show, onClose }: { show: boolean; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setLoading(true);
      fetch("/api/production/materials/missing")
        .then(res => res.json())
        .then(data => {
          setItems(data.items || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [show]);

  return (
    <>
      <div 
        className={`offcanvas offcanvas-end shadow-sm ${show ? "show" : ""}`} 
        style={{ width: "600px", visibility: show ? "visible" : "hidden", transition: "transform 0.3s ease-in-out" }}
        tabIndex={-1}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title d-flex align-items-center text-danger fw-bold">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Vật tư bị thiếu trong Kho
          </h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>
        
        <div className="offcanvas-body p-0">
          <div className="p-3 bg-danger-soft text-danger small border-bottom">
            <i className="bi bi-info-circle me-1"></i>
            Đây là danh sách các vật tư/linh kiện đang được sử dụng trong các Định mức (BOM) nhưng <strong>chưa được tạo mã</strong> hoặc <strong>không tồn tại</strong> trong danh mục Kho vật tư.
          </div>
          
          {loading ? (
            <div className="d-flex justify-content-center align-items-center p-5 text-muted">
              <span className="spinner-border spinner-border-sm me-2"></span> Đang tải dữ liệu...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center p-5 text-muted">
              <i className="bi bi-check-circle fs-1 text-success mb-3 d-block"></i>
              Tuyệt vời! Không có vật tư nào bị thiếu.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle m-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3 py-2 text-muted fw-semibold" style={{ fontSize: "0.85rem", width: 120 }}>Mã vật tư</th>
                    <th className="px-3 py-2 text-muted fw-semibold" style={{ fontSize: "0.85rem" }}>Tên vật tư</th>
                    <th className="px-3 py-2 text-muted fw-semibold text-center" style={{ fontSize: "0.85rem", width: 80 }}>Số lượng</th>
                    <th className="px-3 py-2 text-muted fw-semibold" style={{ fontSize: "0.85rem" }}>Định mức (BOM) sử dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 fw-bold text-primary" style={{ fontSize: "0.9rem" }}>{item.maVatTu || "-"}</td>
                      <td className="px-3 py-2 fw-medium text-dark">{item.tenVatTu}</td>
                      <td className="px-3 py-2 text-center text-danger fw-bold">{item.totalSoLuong}</td>
                      <td className="px-3 py-2">
                        <div className="d-flex flex-column gap-1">
                          {item.boms.map((b: any, bIdx: number) => (
                            <span key={bIdx} className="badge bg-light text-secondary border text-start text-truncate" style={{ maxWidth: 250 }} title={b.name}>
                              {b.code ? `${b.code} - ` : ""}{b.name}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="offcanvas-footer border-top p-3 bg-light">
          <button className="btn btn-secondary w-100" onClick={onClose}>Đóng</button>
        </div>
      </div>
      
      {show && <div className="offcanvas-backdrop fade show" onClick={onClose}></div>}
    </>
  );
}
