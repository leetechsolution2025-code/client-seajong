import React, { useEffect, useState } from "react";

interface ProductionOrderDetailOffcanvasProps {
  orderId: string | null;
  show: boolean;
  onHide: () => void;
}

export function ProductionOrderDetailOffcanvas({ orderId, show, onHide }: ProductionOrderDetailOffcanvasProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (show && orderId) {
      setLoading(true);
      fetch(`/api/production/orders/${orderId}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.error) {
            console.error(resData.error);
            setData(null);
          } else {
            setData(resData);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [show, orderId]);

  return (
    <>
      {show && <div className="offcanvas-backdrop fade show" onClick={onHide} style={{ zIndex: 1040 }}></div>}
      <div 
        className={`offcanvas offcanvas-end ${show ? "show" : ""}`} 
        tabIndex={-1} 
        style={{ width: 400, visibility: show ? "visible" : "hidden", transition: "transform 0.3s ease-in-out", zIndex: 1045 }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold">Chi tiết lệnh sản xuất</h5>
          <button type="button" className="btn-close shadow-none" onClick={onHide} aria-label="Close"></button>
        </div>
        
        <div className="offcanvas-body p-0">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center h-100">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : data ? (
            <div>
              {/* Thông tin chung */}
              <div className="p-3 border-bottom bg-light bg-opacity-50">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small">Mã lệnh:</span>
                  <span className="fw-bold text-primary">{data.order?.id}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small">Ngày đặt:</span>
                  <span className="fw-medium text-dark">
                    {data.order?.ngayDat ? new Date(data.order.ngayDat).toLocaleDateString("vi-VN") : "—"}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small">Hoàn thành dự kiến:</span>
                  <span className="fw-medium text-dark">
                    {data.order?.ngayHoanThanh ? new Date(data.order.ngayHoanThanh).toLocaleDateString("vi-VN") : "—"}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">Trạng thái:</span>
                  <span className={`badge rounded-pill px-2 ${
                    data.order?.trangThai === "completed" ? "bg-primary-subtle text-primary" :
                    data.order?.trangThai === "running" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"
                  }`} style={{ fontSize: 10, fontWeight: 600 }}>
                    {data.order?.trangThai === "completed" ? "Hoàn thành" : data.order?.trangThai === "running" ? "Đang chạy" : "Chờ duyệt"}
                  </span>
                </div>
              </div>

              {/* Hàng hoá cần sản xuất */}
              <div className="p-3 border-bottom">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
                  <i className="bi bi-box-seam text-primary"></i> 
                  Hàng hoá cần sản xuất
                </h6>
                {data.items?.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {data.items.map((item: any) => (
                      <div key={item.id} className="d-flex justify-content-between align-items-start border p-2 rounded bg-white">
                        <div>
                          <div className="fw-medium text-dark" style={{ fontSize: 13 }}>{item.tenHang}</div>
                          {!item.bomFound && (
                            <div className="text-danger mt-1" style={{ fontSize: 11 }}>
                              <i className="bi bi-exclamation-triangle me-1"></i> Chưa có định mức
                            </div>
                          )}
                        </div>
                        <div className="fw-bold text-primary px-2 py-1 bg-primary-subtle rounded text-center min-w-40" style={{ fontSize: 12 }}>
                          x{item.soLuong}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted small fst-italic">Không có hàng hoá</div>
                )}
              </div>

              {/* Bóc tách vật tư */}
              <div className="p-3">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
                  <i className="bi bi-tools text-warning"></i> 
                  Bóc tách vật tư & phụ kiện
                </h6>
                {data.materials?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover mb-0" style={{ fontSize: 12 }}>
                      <thead className="table-light">
                        <tr>
                          <th className="fw-semibold text-muted">Vật tư</th>
                          <th className="fw-semibold text-muted text-center" style={{ width: 80 }}>Số lượng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.materials.map((mat: any, idx: number) => (
                          <tr key={idx}>
                            <td>
                              <div className="fw-medium text-dark">{mat.tenVatTu}</div>
                              <div className="text-muted" style={{ fontSize: 10 }}>Mã: {mat.code}</div>
                            </td>
                            <td className="text-center align-middle">
                              <span className="fw-bold text-dark">{mat.soLuong}</span>
                              <span className="text-muted ms-1 small">{mat.donViTinh}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-muted small fst-italic border rounded p-3 text-center bg-light">
                    Không tìm thấy dữ liệu định mức để bóc tách vật tư.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="p-3 text-muted">Có lỗi xảy ra khi tải dữ liệu</div>
          )}
        </div>
      </div>
    </>
  );
}
