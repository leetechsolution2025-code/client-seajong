import React from "react";

export default function BOMPriceDetailsOffcanvas({
  show,
  onClose,
  bomData,
  selectedProduct,
  initialCost
}: {
  show: boolean;
  onClose: () => void;
  bomData: any;
  selectedProduct: any;
  initialCost: number;
}) {
  if (!show) return null;

  const marginPct = selectedProduct?.loiNhuanKyVong || 0;
  const marginType = selectedProduct?.phuongPhapTinhLoiNhuan || "revenue";
  const giaBan = selectedProduct?.giaBan || 0;

  let calculatedPrice = 0;
  if (marginType === "revenue" && marginPct < 100) {
    calculatedPrice = initialCost / (1 - marginPct / 100);
  } else if (marginType === "cost") {
    calculatedPrice = initialCost * (1 + marginPct / 100);
  }
  calculatedPrice = Math.round(calculatedPrice / 1000) * 1000;

  return (
    <div className="offcanvas offcanvas-end show bg-light shadow" tabIndex={-1} style={{ visibility: 'visible', width: '500px', zIndex: 1050 }}>
      <div className="offcanvas-header bg-white border-bottom">
        <div>
          <h5 className="offcanvas-title fw-bold text-dark mb-1">
            <i className="bi bi-calculator me-2 text-primary"></i>Chi tiết cấu thành giá bán
          </h5>
          <div className="small text-muted">
            <i className="bi bi-box me-1"></i>{selectedProduct?.tenHang || selectedProduct?.name || "Thành phẩm"}
          </div>
        </div>
        <button type="button" className="btn-close text-reset" onClick={onClose} aria-label="Close"></button>
      </div>

      <div className="offcanvas-body p-4">
        {/* Phần 1: Chi phí nguyên vật liệu */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom-0 pt-3 pb-2">
            <h6 className="fw-bold mb-0 text-primary">1. Chi phí nguyên vật liệu (Giá vốn)</h6>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0 align-middle" style={{ fontSize: '13px' }}>
                <thead className="table-light text-muted">
                  <tr>
                    <th className="ps-3 py-2 fw-medium">Tên vật tư</th>
                    <th className="text-center py-2 fw-medium">SL</th>
                    <th className="text-end py-2 fw-medium">Đơn giá</th>
                    <th className="text-end pe-3 py-2 fw-medium">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(bomData?.vatTu || []).map((item: any, idx: number) => {
                    const price = item.material?.price || item.material?.giaNhap || 0;
                    const qty = Number(item.soLuong) || 0;
                    const total = price * qty;
                    return (
                      <tr key={idx}>
                        <td className="ps-3 py-2">
                          <div className="fw-medium text-dark">{item.material?.tenHang || item.tenVatTu || "Chưa rõ"}</div>
                          <div className="small text-muted" style={{ fontSize: '11px' }}>{item.material?.code || item.maVatTu}</div>
                        </td>
                        <td className="text-center py-2">{qty}</td>
                        <td className="text-end py-2">{price.toLocaleString()} đ</td>
                        <td className="text-end pe-3 py-2 fw-medium text-dark">{total.toLocaleString()} đ</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="table-light">
                  <tr>
                    <td colSpan={3} className="ps-3 py-3 fw-bold text-dark text-end">Tổng giá vốn vật tư:</td>
                    <td className="pe-3 py-3 fw-bold text-danger text-end fs-6">{initialCost.toLocaleString()} đ</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Phần 2: Cấu hình lợi nhuận */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom-0 pt-3 pb-2">
            <h6 className="fw-bold mb-0 text-primary">2. Cấu hình lợi nhuận</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-6">
                <label className="form-label small text-muted mb-1">Tỷ suất kỳ vọng</label>
                <div className="fw-bold fs-5 text-dark">{marginPct}%</div>
              </div>
              <div className="col-6">
                <label className="form-label small text-muted mb-1">Phương pháp tính</label>
                <div className="fw-medium text-dark">{marginType === 'revenue' ? 'Trên doanh thu' : 'Trên giá vốn'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Phần 3: Công thức và Giá tính toán */}
        <div className="card border-0 shadow-sm mb-4 bg-primary text-white" style={{ background: 'linear-gradient(45deg, #0d6efd, #0dcaf0)' }}>
          <div className="card-body text-center py-4">
            <h6 className="fw-medium mb-3 opacity-75">3. Giá bán tính toán (Đề xuất)</h6>
            <div className="display-6 fw-bold mb-3">{calculatedPrice.toLocaleString()} đ</div>
            <div className="bg-white bg-opacity-10 rounded p-2 text-start small font-monospace">
              <div className="opacity-75 mb-1">Công thức áp dụng:</div>
              {marginType === "revenue"
                ? `${initialCost.toLocaleString()} đ / (1 - ${marginPct}%) = ${calculatedPrice.toLocaleString()} đ`
                : `${initialCost.toLocaleString()} đ × (1 + ${marginPct}%) = ${calculatedPrice.toLocaleString()} đ`
              }
            </div>
          </div>
        </div>

        {/* Phần 4: Giá bán chính thức */}
        <div className="card border-0 shadow-sm border-start border-4 border-success">
          <div className="card-body">
            <label className="form-label small text-muted fw-bold mb-1">Giá bán chính thức đang áp dụng</label>
            <div className="d-flex align-items-center justify-content-between">
              <div className="fs-4 fw-bold text-success">{giaBan.toLocaleString()} đ</div>
              {giaBan !== calculatedPrice && (
                <span className="badge bg-warning text-dark"><i className="bi bi-exclamation-triangle me-1"></i>Có chênh lệch</span>
              )}
            </div>
            {giaBan !== calculatedPrice && (
              <div className="small text-muted mt-2">
                Giá bán chính thức hiện tại khác với Giá bán tính toán theo định mức. Bạn có thể bấm nút sửa giá ở bên ngoài để cập nhật lại.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
