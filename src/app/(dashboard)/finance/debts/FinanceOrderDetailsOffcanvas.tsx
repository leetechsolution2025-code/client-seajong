"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChiTietDonHang } from "@/components/plan-finance/bao_gia/ChiTietDonHang";
import { cn } from "@/lib/utils";

const formatCurrency = (val: number) => {
  if (typeof val !== 'number') return "0";
  return (Math.round(val / 1000) * 1000).toLocaleString("vi-VN");
};

interface Props {
  orderId: string | null;
  onClose: () => void;
}

export function FinanceOrderDetailsOffcanvas({ orderId, onClose }: Props) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    setLoading(true);
    fetch(`/api/plan-finance/sales/${orderId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
      })
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (!orderId) return null;

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const parseGuestInfo = (ghiChu: string | null) => {
    let name = "", phone = "", address = "";
    if (!ghiChu) return { name, phone, address };
    const guestMatch = ghiChu.match(/\[GuestInfo:(.*?)\]/);
    if (guestMatch) {
      try {
        const parsed = JSON.parse(guestMatch[1]);
        name = parsed.name || name;
        phone = parsed.dienThoai || phone;
        address = parsed.address || address;
      } catch (e) {}
    }
    const lines = ghiChu.split("\n");
    for (const line of lines) {
      if (line.startsWith("Tên khách hàng: ")) name = line.replace("Tên khách hàng: ", "");
      if (line.startsWith("Số điện thoại: ")) phone = line.replace("Số điện thoại: ", "");
      if (line.startsWith("Địa chỉ giao hàng: ")) address = line.replace("Địa chỉ giao hàng: ", "");
    }
    return { name, phone, address };
  };

  const displayCustomer = {
    name: order?.customer?.name || "Khách vãng lai",
    dienThoai: order?.customer?.dienThoai || "",
    address: order?.customer?.address || "",
  };
  
  if (order?.ghiChu) {
    const parsed = parseGuestInfo(order.ghiChu);
    if (parsed.name) displayCustomer.name = parsed.name;
    if (parsed.phone) displayCustomer.dienThoai = parsed.phone;
    if (parsed.address) displayCustomer.address = parsed.address;
  }

  // Logistics & QC
  const lTickets = order?.logisticsTickets || [];
  const qcTickets = order?.qcTickets || [];
  const hasLogistics = lTickets.length > 0;
  const hasQC = qcTickets.length > 0;

  const getTicketStatusBadge = (status: string) => {
    if (status === "COMPLETED") return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1" style={{ fontSize: "11.5px" }}>Hoàn thành</span>;
    if (status === "CANCELLED") return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1" style={{ fontSize: "11.5px" }}>Đã huỷ</span>;
    if (status === "IN_PROGRESS") return <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1" style={{ fontSize: "11.5px" }}>Đang thực hiện</span>;
    return <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1" style={{ fontSize: "11.5px" }}>Chờ xử lý</span>;
  };

  const getQcStatusBadge = (result: string | null) => {
    if (result === "Đạt") return <span className="badge bg-success-subtle text-success px-2 py-1" style={{ fontSize: "11.5px" }}>Đạt</span>;
    if (result === "Không đạt") return <span className="badge bg-danger-subtle text-danger px-2 py-1" style={{ fontSize: "11.5px" }}>Không đạt</span>;
    if (result === "Lỗi một phần") return <span className="badge bg-warning-subtle text-warning px-2 py-1" style={{ fontSize: "11.5px" }}>Lỗi 1 phần</span>;
    return <span className="badge bg-secondary-subtle text-secondary px-2 py-1" style={{ fontSize: "11.5px" }}>Chưa rõ</span>;
  };

  return (
    <>
      <div 
        onClick={onClose} 
        style={{ 
          position: "fixed", 
          inset: 0, 
          zIndex: 1099, 
          background: "rgba(0,0,0,0.35)", 
          backdropFilter: "blur(2px)",
          display: showOrderModal ? "none" : "block"
        }} 
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 400, maxWidth: "100vw", zIndex: 1100,
        background: "var(--card)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        display: showOrderModal ? "none" : "flex", flexDirection: "column",
        borderLeft: "1px solid var(--border)",
        animation: "slideInRight 0.22s ease-out",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "linear-gradient(to right, var(--background), var(--secondary-subtle))" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="d-flex align-items-center gap-2.5">
              <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 34, height: 34, background: "rgba(0, 48, 135, 0.08)", color: "#003087" }}>
                <i className="bi bi-file-earmark-text fs-5" />
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                  Chi tiết chứng từ gốc
                </p>
                <h5 className="offcanvas-title fw-bold mb-0 text-dark" style={{ fontSize: 16.5, letterSpacing: -0.2 }}>
                  {order?.code ?? orderId}
                </h5>
              </div>
            </div>
            <button onClick={onClose} type="button" className="btn-close mt-1" style={{ fontSize: 13 }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="bg-light">
          {loading ? (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-2 text-muted">
              <div className="spinner-border spinner-border-sm text-primary" />
              <span style={{ fontSize: 14 }}>Đang tải thông tin...</span>
            </div>
          ) : order ? (
            <div className="d-flex flex-column gap-2.5">
              
              {/* Box Khách hàng */}
              <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
                <p className="mb-1.5" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.02em" }}>
                  Thông tin đối tác
                </p>
                <div className="fw-bold text-dark mb-1.5 d-flex align-items-center flex-wrap gap-2" style={{ fontSize: 14.5 }}>
                  <span>{displayCustomer.name}</span>
                  {order?.customer?.nhom === 'dai-ly' && (
                    <span className="badge bg-success-subtle text-success rounded-pill px-2 py-1" style={{ fontSize: 11 }}>Đại lý</span>
                  )}
                </div>
                {displayCustomer.dienThoai && (
                  <div className="text-muted mb-1 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                    <i className="bi bi-telephone text-secondary flex-shrink-0" style={{ fontSize: 12.5 }} />
                    <span>{displayCustomer.dienThoai}</span>
                  </div>
                )}
                {displayCustomer.address && (
                  <div className="text-muted d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                    <i className="bi bi-geo-alt text-secondary flex-shrink-0" style={{ fontSize: 12.5 }} />
                    <span>{displayCustomer.address}</span>
                  </div>
                )}
              </div>

              {/* Box Giá trị & Thời gian */}
              <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
                <div className="row g-2">
                  <div className="col-6 border-end">
                    <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Ngày đặt hàng</div>
                    <div className="fw-semibold text-dark" style={{ fontSize: 14 }}>{fmtDate(order.ngayDat)}</div>
                  </div>
                  <div className="col-6 ps-3">
                    <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Ngày giao (dự kiến)</div>
                    <div className="fw-semibold text-dark" style={{ fontSize: 14 }}>{fmtDate(order.ngayGiao)}</div>
                  </div>
                  <div className="col-12 border-top pt-2 mt-2">
                    <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Tổng giá trị đơn hàng</div>
                    <div className="fw-bold text-primary" style={{ fontSize: 17 }}>{formatCurrency(order.tongTien)} đ</div>
                  </div>
                </div>
              </div>

              {/* Box Kho & QC */}
              <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
                <p className="mb-2" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.02em" }}>
                  Chứng từ Kho & QC
                </p>
                {!hasLogistics && !hasQC ? (
                  <div className="text-muted fst-italic" style={{ fontSize: 12.5 }}>Không có dữ liệu xuất/nhập kho hoặc QC.</div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {lTickets.map((t: any) => (
                      <div key={t.id} className="d-flex align-items-center justify-content-between p-2 rounded bg-light border">
                        <div className="d-flex flex-column gap-0.5">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-box-seam text-primary flex-shrink-0" style={{ fontSize: 13.5 }} />
                            <span className="fw-bold text-dark" style={{ fontSize: 13.5, letterSpacing: "0.2px" }}>{t.code}</span>
                          </div>
                          <div className="text-muted" style={{ fontSize: 11.5, paddingLeft: "21px" }}>
                            {t.type === "BATCH_PACKING" ? "Lệnh xuất kho" : t.type} • {fmtDate(t.createdAt)}
                          </div>
                        </div>
                        <div>
                          {getTicketStatusBadge(t.status)}
                        </div>
                      </div>
                    ))}
                    {qcTickets.map((q: any) => (
                      <div key={q.id} className="d-flex align-items-center justify-content-between p-2 rounded bg-light border">
                        <div className="d-flex flex-column gap-0.5">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-shield-check text-primary flex-shrink-0" style={{ fontSize: 13.5 }} />
                            <span className="fw-bold text-dark" style={{ fontSize: 13.5, letterSpacing: "0.2px" }}>{q.code}</span>
                          </div>
                          <div className="text-muted" style={{ fontSize: 11.5, paddingLeft: "21px" }}>
                            QC Ticket • {fmtDate(q.createdAt)}
                          </div>
                        </div>
                        <div>
                          {getQcStatusBadge(q.result)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-5 text-muted" style={{ fontSize: 13.5 }}>
              Không tìm thấy dữ liệu.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--card)", flexShrink: 0 }}>
          <div className="d-flex align-items-center justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-light border fw-medium px-3"
              style={{ fontSize: "13.5px", height: "36px" }}
              onClick={onClose}
            >
              Đóng
            </button>
            <button
              type="button"
              className="btn btn-primary fw-medium px-3 d-flex align-items-center gap-1.5 shadow-sm"
              style={{ fontSize: "13.5px", height: "36px", backgroundColor: "#003087", borderColor: "#003087" }}
              onClick={() => setShowOrderModal(true)}
              disabled={!order}
            >
              <i className="bi bi-box-arrow-up-right me-1" />
              Mở đơn hàng
            </button>
          </div>
        </div>
      </div>

      {/* Modal Chi tiết đơn hàng khi click Mở đơn hàng */}
      {showOrderModal && typeof document !== "undefined" && createPortal(
        <div style={{ position: "relative", zIndex: 1200 }}>
          <ChiTietDonHang
            orderId={order?.id || orderId}
            onClose={() => setShowOrderModal(false)}
            onSaved={() => {
              if (orderId) {
                fetch(`/api/plan-finance/sales/${orderId}`)
                  .then(r => r.json())
                  .then(d => setOrder(d));
              }
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}
