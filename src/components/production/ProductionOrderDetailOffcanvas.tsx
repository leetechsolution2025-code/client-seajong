import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ProductionOrderDetailOffcanvasProps {
  orderId: string | null;
  show: boolean;
  onHide: () => void;
  onUpdate?: () => void;
}

export function ProductionOrderDetailOffcanvas({ orderId, show, onHide, onUpdate }: ProductionOrderDetailOffcanvasProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentMessage, setIncidentMessage] = useState("");
  const [submittingIncident, setSubmittingIncident] = useState(false);

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

  const handleUpdateStatus = async (newStatus: string) => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/production/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: newStatus })
      });
      if (res.ok) {
        const resData = await fetch(`/api/production/orders/${orderId}`).then(r => r.json());
        setData(resData);
        if (onUpdate) onUpdate();
        toast.success("Cập nhật trạng thái thành công");
      } else {
        toast.error("Có lỗi xảy ra khi cập nhật trạng thái");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const handleReportIncident = async () => {
    if (!orderId || !incidentMessage.trim()) return;
    try {
      setSubmittingIncident(true);
      const res = await fetch(`/api/production/orders/${orderId}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: incidentMessage })
      });
      if (res.ok) {
        setShowIncidentModal(false);
        setIncidentMessage("");
        if (onUpdate) onUpdate();
        toast.success("Đã gửi báo cáo sự cố thành công!");
      } else {
        toast.error("Có lỗi xảy ra khi gửi báo cáo");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi hệ thống");
    } finally {
      setSubmittingIncident(false);
    }
  };

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
                  <div className={`badge ${data.order?.trangThai === "completed" ? "bg-primary-subtle text-primary" : data.order?.trangThai === "running" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"} rounded-pill px-3 py-2 fw-medium`} style={{ fontSize: 10 }}>
                    {data.order?.trangThai === "completed" ? "Đã thực hiện" : data.order?.trangThai === "running" ? "Đang thực hiện" : "Chưa thực hiện"}
                  </div>
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
        
        {/* Footer */}
        {data && data.order?.trangThai !== "completed" && (
          <div className="p-3 border-top bg-light mt-auto">
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-danger flex-grow-1" 
                style={{ fontSize: 13, fontWeight: 500 }}
                onClick={() => setShowIncidentModal(true)}
              >
                <i className="bi bi-exclamation-triangle me-2"></i>
                Báo cáo sự cố
              </button>
              
              {data.order?.trangThai === "pending" && (
                <button 
                  className="btn btn-primary flex-grow-1" 
                  style={{ fontSize: 13, fontWeight: 500 }}
                  onClick={() => handleUpdateStatus("running")}
                >
                  <i className="bi bi-play-circle me-2"></i>
                  Thực hiện
                </button>
              )}
              
              {data.order?.trangThai === "running" && (
                <button 
                  className="btn btn-success flex-grow-1" 
                  style={{ fontSize: 13, fontWeight: 500 }}
                  onClick={() => handleUpdateStatus("completed")}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  Hoàn thành
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Incident Modal */}
      {showIncidentModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom-0 bg-light">
                <h6 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i> Báo cáo sự cố
                </h6>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowIncidentModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold small text-muted">Mô tả sự cố <span className="text-danger">*</span></label>
                  <textarea 
                    className="form-control" 
                    rows={4} 
                    placeholder="Nhập chi tiết sự cố đang gặp phải..."
                    value={incidentMessage}
                    onChange={(e) => setIncidentMessage(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer border-top-0 pt-0">
                <button 
                  type="button" 
                  className="btn btn-light rounded-3 fw-medium" 
                  onClick={() => setShowIncidentModal(false)}
                >
                  Hủy
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger rounded-3 fw-medium" 
                  disabled={!incidentMessage.trim() || submittingIncident}
                  onClick={handleReportIncident}
                >
                  {submittingIncident ? "Đang gửi..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
