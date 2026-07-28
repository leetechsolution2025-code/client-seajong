import React, { useState, useEffect } from "react";

export function MissingMaterialsOffcanvas({ show, onClose }: { show: boolean; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [missingProducts, setMissingProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setLoading(true);
      fetch("/api/logistics/inventory/missing")
        .then(res => res.json())
        .then(data => {
          setItems(data.items || []);
          setMissingProducts(data.missingProducts || []);
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
            Đây là danh sách các sản phẩm và vật tư đang bị thiếu hoặc không tồn tại trong hệ thống.
          </div>
          
          {loading ? (
            <div className="d-flex justify-content-center align-items-center p-5 text-muted">
              <span className="spinner-border spinner-border-sm me-2"></span> Đang tải dữ liệu...
            </div>
          ) : items.length === 0 && missingProducts.length === 0 ? (
            <div className="text-center p-5 text-muted">
              <i className="bi bi-check-circle fs-1 text-success mb-3 d-block"></i>
              Tuyệt vời! Không có vật tư hay sản phẩm nào bị thiếu.
            </div>
          ) : (
            <div className="d-flex flex-column">
              {missingProducts.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 bg-light border-bottom border-top fw-bold text-dark d-flex justify-content-between align-items-center">
                    <span>Sản phẩm bị thiếu (Bỏ qua khi Import BOM)</span>
                    <span className="badge bg-danger rounded-pill">{missingProducts.length}</span>
                  </div>
                  <div className="p-3">
                    <div className="d-flex flex-wrap gap-2">
                      {missingProducts.map((p, idx) => (
                        <span key={idx} className="badge bg-danger-soft text-danger border border-danger border-opacity-25 py-2 px-3">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {items.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-light border-bottom border-top fw-bold text-dark d-flex justify-content-between align-items-center">
                    <span>Linh kiện / Vật tư bị thiếu trong BOM</span>
                    <span className="badge bg-warning text-dark rounded-pill">{items.length}</span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover table-sm align-middle m-0">
                      <thead className="table-light">
                        <tr>
                          <th className="px-3 py-2 text-muted fw-semibold" style={{ fontSize: "0.8rem", width: 200 }}>Vật tư (Mã & Tên)</th>
                          <th className="px-3 py-2 text-muted fw-semibold text-center" style={{ fontSize: "0.85rem", width: 80 }}>Số lượng</th>
                          <th className="px-3 py-2 text-muted fw-semibold" style={{ fontSize: "0.85rem" }}>Định mức (BOM) sử dụng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              <div className="fw-bold text-primary mb-1" style={{ fontSize: "0.85rem" }}>{item.maVatTu || "-"}</div>
                              <div className="fw-medium text-dark text-wrap" style={{ fontSize: "0.8rem", lineHeight: "1.2" }}>{item.tenVatTu}</div>
                            </td>
                            <td className="px-3 py-2 text-center text-danger fw-bold">{item.totalSoLuong}</td>
                            <td className="px-3 py-2">
                              <div className="d-flex flex-column gap-1">
                                {item.boms.map((b: any, bIdx: number) => (
                                  <span key={bIdx} className="badge bg-light text-secondary border text-start text-truncate" style={{ maxWidth: 250, fontSize: "0.75rem", fontWeight: "normal" }} title={b.name}>
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
                </div>
              )}
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
