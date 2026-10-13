"use client";

import React, { useState, useEffect } from "react";
import { docSoTien } from "./DebtPaymentOffcanvas";
import { format } from "date-fns";

const formatCurrency = (val: number) => {
  if (typeof val !== "number" || isNaN(val)) return "0";
  return (Math.round(val / 1000) * 1000).toLocaleString("vi-VN");
};

interface Props {
  item: any | null;
  onClose: () => void;
  onPayDebt?: (item: any) => void;
}

export function FinancePayableDetailsOffcanvas({ item, onClose, onPayDebt }: Props) {
  const [poData, setPoData] = useState<any>(null);
  const [loadingPo, setLoadingPo] = useState(false);

  // Parse debt description to extract payment history if exists
  const parsedDebt = React.useMemo(() => {
    if (!item?.description) return { originalDesc: "", history: [] };
    try {
      const parts = item.description.split("[PAYMENT_LOGS]:");
      const originalDesc = parts[0]?.trim() || "";
      const historyStr = parts[1]?.split("[RECONCILIATION_LOGS]:")[0]?.trim();
      const history = historyStr ? JSON.parse(historyStr) : [];
      return { originalDesc, history };
    } catch {
      return { originalDesc: item.description, history: [] };
    }
  }, [item?.description]);

  useEffect(() => {
    if (!item) {
      setPoData(null);
      return;
    }

    const ref = item.referenceId || "";
    // If it's a purchase order (starts with DH-), fetch the purchase order details
    if (ref.startsWith("DH-") || item.purchaseOrderId) {
      const codeOrId = ref.replace(/-VC$/, "") || item.purchaseOrderId;
      setLoadingPo(true);
      fetch(`/api/plan-finance/purchasing/${codeOrId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Fetch PO failed");
          return res.json();
        })
        .then((data) => {
          setPoData(data);
        })
        .catch((err) => {
          console.warn("Could not load PO details:", err);
          setPoData(null);
        })
        .finally(() => setLoadingPo(false));
    } else {
      setPoData(null);
    }
  }, [item]);

  if (!item) return null;

  const originalAmount = item.amount || 0;
  const paid = item.paidAmount || 0;
  const remaining = Math.max(0, originalAmount - paid);

  const isCarrier = !!item.carrierId || item.referenceId?.endsWith("-VC") || item.displayDescription?.toLowerCase().includes("vận chuyển");
  const partnerName = item.supplierName || item.partnerName || poData?.supplier?.name || "Nhà cung cấp";
  const partnerPhone = item.supplierPhone || item.phone || poData?.supplier?.phone;
  const partnerAddress = item.supplierAddress || item.address || poData?.supplier?.address;
  const partnerTaxCode = item.supplierTaxCode || poData?.supplier?.taxCode;
  const partnerContact = item.supplierContactName || poData?.supplier?.contactName;

  const fmtDate = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return "—";
      return format(date, "HH:mm:ss dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

  const fmtDateOnly = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return "—";
      return format(date, "dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== "PAID" && remaining > 0;

  const getStatusBadge = (status: string, rem: number) => {
    if (status === "PAID" || rem <= 0) {
      return <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 rounded-pill" style={{ fontSize: 11.5 }}>Đã thanh toán</span>;
    }
    if (status === "PARTIAL" || (paid > 0 && rem > 0)) {
      return <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2.5 py-1 rounded-pill" style={{ fontSize: 11.5 }}>Thanh toán 1 phần</span>;
    }
    return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1 rounded-pill" style={{ fontSize: 11.5 }}>Chưa thanh toán</span>;
  };

  const getPoStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      draft: { label: "Đang tạo đơn", color: "secondary" },
      ordered: { label: "Đã đặt hàng", color: "primary" },
      received: { label: "Đã nhận hàng", color: "info" },
      completed: { label: "Hoàn thành", color: "success" },
      disputed: { label: "Khiếu nại", color: "danger" },
      paused: { label: "Tạm dừng", color: "warning" },
      cancelled: { label: "Đã huỷ", color: "danger" },
    };
    const s = map[status] || { label: status, color: "secondary" };
    return (
      <span className={`badge bg-${s.color}-subtle text-${s.color} border border-${s.color}-subtle px-2 py-0.5 rounded-pill`} style={{ fontSize: 11 }}>
        {s.label}
      </span>
    );
  };

  const noteText = parsedDebt.originalDesc || item.displayDescription || item.description || "Khoản công nợ phải trả phát sinh";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1099,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Offcanvas 400px */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          maxWidth: "100vw",
          zIndex: 1100,
          background: "var(--card)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid var(--border)",
          animation: "slideInRight 0.22s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
            background: "linear-gradient(to right, var(--background), var(--secondary-subtle))",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="d-flex align-items-center gap-2.5">
              <div
                className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 34, height: 34, background: "rgba(0, 48, 135, 0.08)", color: "#003087" }}
              >
                <i className={`bi ${isCarrier ? "bi-truck" : "bi-journal-arrow-down"} fs-5`} />
              </div>
              <div>
                <p
                  style={{
                    margin: "0 0 2px",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Chi tiết khoản nợ phải trả
                </p>
                <h5 className="offcanvas-title fw-bold mb-0 text-dark" style={{ fontSize: 16, letterSpacing: -0.2 }}>
                  {item.referenceId || "KHOẢN NỢ PHẢI TRẢ"}
                </h5>
              </div>
            </div>
            <button onClick={onClose} type="button" className="btn-close mt-1" style={{ fontSize: 13 }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="bg-light">
          <div className="d-flex flex-column gap-2.5">

            {/* Box Nhà cung cấp / Đối tác */}
            <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
              <p
                className="mb-1.5"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--primary)",
                  letterSpacing: "0.02em",
                }}
              >
                Thông tin đối tác
              </p>
              <div className="fw-bold text-dark mb-1 d-flex align-items-center flex-wrap gap-2" style={{ fontSize: 14.5 }}>
                <span>{partnerName}</span>
                {isCarrier ? (
                  <span className="badge bg-info-subtle text-info rounded-pill px-2 py-0.5" style={{ fontSize: 10.5, fontWeight: 600 }}>
                    <i className="bi bi-truck me-1" />
                    Vận chuyển
                  </span>
                ) : (
                  <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-0.5" style={{ fontSize: 10.5 }}>
                    Nhà cung cấp
                  </span>
                )}
              </div>

              {partnerContact && (
                <div className="text-muted mb-1" style={{ fontSize: 13 }}>
                  <i className="bi bi-person me-1.5 text-secondary" /> {partnerContact}
                </div>
              )}
              {partnerPhone && (
                <div className="text-muted mb-1" style={{ fontSize: 13 }}>
                  <i className="bi bi-telephone me-1.5 text-secondary" /> {partnerPhone}
                </div>
              )}
              {partnerAddress && (
                <div className="text-muted mb-1" style={{ fontSize: 13 }}>
                  <i className="bi bi-geo-alt me-1.5 text-secondary" /> {partnerAddress}
                </div>
              )}
              {partnerTaxCode && (
                <div className="text-muted" style={{ fontSize: 12.5 }}>
                  <i className="bi bi-hash me-1.5 text-secondary" /> MST: {partnerTaxCode}
                </div>
              )}
            </div>

            {/* Box Giá trị công nợ & Trạng thái */}
            <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <p
                  className="mb-0"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--primary)",
                    letterSpacing: "0.02em",
                  }}
                >
                  Giá trị công nợ
                </p>
                {getStatusBadge(item.status, remaining)}
              </div>

              <div className="mb-2">
                <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Số tiền nợ gốc</div>
                <div className="fw-bold text-dark" style={{ fontSize: 18 }}>
                  {formatCurrency(originalAmount)} đ
                </div>
                {originalAmount > 0 && (
                  <div className="text-muted fst-italic mt-0.5" style={{ fontSize: 11.5 }}>
                    (Bằng chữ: {docSoTien(originalAmount)})
                  </div>
                )}
              </div>

              <div className="border-top pt-2.5 mt-1">
                <div className="row g-2">
                  <div className="col-6 border-end">
                    <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Đã thanh toán</div>
                    <div className="fw-semibold text-success" style={{ fontSize: 14 }}>
                      {formatCurrency(paid)} đ
                    </div>
                  </div>
                  <div className="col-6 ps-2">
                    <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Còn lại phải trả</div>
                    <div className={`fw-bold ${remaining > 0 ? "text-primary" : "text-muted"}`} style={{ fontSize: 15 }}>
                      {formatCurrency(remaining)} đ
                    </div>
                  </div>

                  <div className="col-6 border-end border-top pt-2 mt-1">
                    <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Ngày phát sinh</div>
                    <div className="fw-medium text-dark" style={{ fontSize: 12.5 }}>
                      {fmtDate(item.createdAt)}
                    </div>
                  </div>
                  <div className="col-6 ps-2 border-top pt-2 mt-1">
                    <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Hạn thanh toán</div>
                    <div className="fw-medium text-dark d-flex align-items-center gap-1" style={{ fontSize: 12.5 }}>
                      <span>{fmtDateOnly(item.dueDate)}</span>
                      {isOverdue && (
                        <span className="badge bg-danger text-white rounded-pill px-1.5 py-0.5" style={{ fontSize: 9.5 }}>
                          Quá hạn
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box Đơn mua hàng tham chiếu (nếu có dữ liệu PO) */}
            {loadingPo ? (
              <div className="card border-0 p-3 rounded-3 shadow-sm bg-white text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary mb-2" />
                <div className="text-muted small">Đang tải thông tin đơn mua hàng...</div>
              </div>
            ) : poData ? (
              <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <p
                    className="mb-0"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--primary)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    Đơn mua hàng liên quan
                  </p>
                  {getPoStatusBadge(poData.trangThai)}
                </div>

                <div className="p-2 rounded bg-light border mb-2.5">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="fw-bold text-dark" style={{ fontSize: 13.5 }}>
                      <i className="bi bi-file-earmark-text text-primary me-1.5" />
                      {poData.code || item.referenceId}
                    </span>
                    <span className="text-muted small">
                      {fmtDateOnly(poData.ngayDat || poData.createdAt)}
                    </span>
                  </div>
                  {poData.ngayNhan && (
                    <div className="text-muted small mt-1">
                      <i className="bi bi-calendar-event me-1" />
                      Dự kiến nhận: <span className="fw-medium text-dark">{fmtDateOnly(poData.ngayNhan)}</span>
                    </div>
                  )}
                  {poData.shippingFee > 0 && (
                    <div className="text-muted small mt-0.5">
                      <i className="bi bi-truck me-1" />
                      Cước vận chuyển: <span className="fw-medium text-dark">{formatCurrency(poData.shippingFee)} đ</span>
                    </div>
                  )}
                </div>

                {/* Danh sách mặt hàng mua */}
                {poData.items && poData.items.length > 0 && (
                  <div>
                    <div className="text-muted mb-1.5 fw-semibold" style={{ fontSize: 12 }}>
                      Mặt hàng đã đặt ({poData.items.length})
                    </div>
                    <div className="d-flex flex-column gap-1.5">
                      {poData.items.map((it: any, idx: number) => {
                        const itemAmount = (it.soLuong || 0) * (it.donGia || 0);
                        return (
                          <div
                            key={it.id || idx}
                            className="d-flex align-items-center justify-content-between p-2 rounded bg-light border-0"
                            style={{ fontSize: 12.5 }}
                          >
                            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                              <div className="fw-medium text-dark text-truncate" title={it.tenHang}>
                                {it.tenHang}
                              </div>
                              <div className="text-muted small">
                                {it.soLuong} {it.donVi || "cái"} × {formatCurrency(it.donGia || 0)} đ
                              </div>
                            </div>
                            <div className="fw-semibold text-dark flex-shrink-0">
                              {formatCurrency(itemAmount)} đ
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Box Diễn giải & Ghi chú */}
            <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
              <p
                className="mb-1.5"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--primary)",
                  letterSpacing: "0.02em",
                }}
              >
                Diễn giải / Nội dung
              </p>
              <div className="text-dark fw-medium" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                {noteText}
              </div>
              {poData?.ghiChu && (
                <div className="mt-2 pt-2 border-top">
                  <div className="text-muted mb-0.5" style={{ fontSize: 11.5 }}>Ghi chú đơn hàng:</div>
                  <div className="text-muted fst-italic" style={{ fontSize: 12.5 }}>
                    {poData.ghiChu}
                  </div>
                </div>
              )}
            </div>

            {/* Box Lịch sử thanh toán nếu có */}
            {parsedDebt.history && parsedDebt.history.length > 0 && (
              <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
                <p
                  className="mb-2"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--primary)",
                    letterSpacing: "0.02em",
                  }}
                >
                  Lịch sử thanh toán ({parsedDebt.history.length})
                </p>
                <div className="d-flex flex-column gap-1.5">
                  {parsedDebt.history.map((hist: any, hIdx: number) => (
                    <div
                      key={hist.id || hIdx}
                      className="d-flex align-items-center justify-content-between p-2 rounded bg-light border"
                      style={{ fontSize: 12.5 }}
                    >
                      <div>
                        <div className="fw-semibold text-success">
                          + {formatCurrency(hist.amount)} đ
                        </div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          {hist.date ? fmtDate(hist.date) : "—"} {hist.method ? `• ${hist.method}` : ""}
                        </div>
                      </div>
                      {hist.ref && (
                        <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10 }}>
                          {hist.ref}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--card)",
            flexShrink: 0,
          }}
        >
          <div className="d-flex align-items-center justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-light border fw-medium px-3"
              style={{ fontSize: "13.5px", height: "36px" }}
              onClick={onClose}
            >
              Đóng
            </button>
            {remaining > 0 && onPayDebt && (
              <button
                type="button"
                className="btn btn-primary fw-medium px-3 d-flex align-items-center gap-1.5 shadow-sm"
                style={{
                  fontSize: "13.5px",
                  height: "36px",
                  backgroundColor: "#003087",
                  borderColor: "#003087",
                }}
                onClick={() => {
                  onPayDebt(item);
                  onClose();
                }}
              >
                <i className="bi bi-cash-coin me-1" />
                Thanh toán nợ
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
