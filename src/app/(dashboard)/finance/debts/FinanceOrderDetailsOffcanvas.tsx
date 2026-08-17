"use client";

import React, { useState, useEffect } from "react";
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
    if (status === "COMPLETED") return <span className="badge bg-success-subtle text-success border border-success-subtle">Hoàn thành</span>;
    if (status === "CANCELLED") return <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Đã huỷ</span>;
    if (status === "IN_PROGRESS") return <span className="badge bg-primary-subtle text-primary border border-primary-subtle">Đang thực hiện</span>;
    return <span className="badge bg-warning-subtle text-warning border border-warning-subtle">Chờ xử lý</span>;
  };

  const getQcStatusBadge = (result: string | null) => {
    if (result === "Đạt") return <span className="badge bg-success-subtle text-success">Đạt</span>;
    if (result === "Không đạt") return <span className="badge bg-danger-subtle text-danger">Không đạt</span>;
    if (result === "Lỗi một phần") return <span className="badge bg-warning-subtle text-warning">Lỗi 1 phần</span>;
    return <span className="badge bg-secondary-subtle text-secondary">Chưa rõ</span>;
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1099, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, minWidth: 400, maxWidth: 400, zIndex: 1100,
        background: "var(--card)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        borderLeft: "1px solid var(--border)",
        animation: "slideInRight 0.22s ease-out",
      }}>
        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "linear-gradient(to right, var(--background), var(--secondary-subtle))" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-text fs-5 text-primary" />
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                  Chi tiết chứng từ gốc
                </p>
                <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 15, letterSpacing: -0.2 }}>
                  {order?.code ?? orderId}
                </h5>
              </div>
            </div>
            <button onClick={onClose} type="button" className="btn-close mt-1" style={{ fontSize: 12 }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="bg-light">
          {loading ? (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-2 text-muted">
              <div className="spinner-border spinner-border-sm text-primary" />
              <span style={{ fontSize: 13 }}>Đang tải thông tin...</span>
            </div>
          ) : order ? (
            <div className="d-flex flex-column gap-2">
              
              {/* Box Khách hàng */}
              <div className="card border-0 p-2 rounded-3 shadow-sm">
                <p className="mb-1" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.02em" }}>
                  Thông tin đối tác
                </p>
                <div className="fw-bold text-dark mb-1" style={{ fontSize: 13 }}>
                  {displayCustomer.name}
                  {order?.customer?.nhom === 'dai-ly' && (
                    <span className="badge bg-success-subtle text-success ms-2 rounded-pill px-2" style={{ fontSize: 9 }}>Đại lý</span>
                  )}
                </div>
                {displayCustomer.dienThoai && (
                  <div className="text-muted mb-0" style={{ fontSize: 12 }}>
                    <i className="bi bi-telephone me-1" /> {displayCustomer.dienThoai}
                  </div>
                )}
                {displayCustomer.address && (
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    <i className="bi bi-geo-alt me-1" /> {displayCustomer.address}
                  </div>
                )}
              </div>

              {/* Box Giá trị & Thời gian */}
              <div className="card border-0 p-2 rounded-3 shadow-sm">
                <div className="row g-2">
                  <div className="col-6 border-end">
                    <div className="text-muted mb-0" style={{ fontSize: 11 }}>Ngày đặt hàng</div>
                    <div className="fw-medium text-dark" style={{ fontSize: 13 }}>{fmtDate(order.ngayDat)}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted mb-0" style={{ fontSize: 11 }}>Ngày giao (dự kiến)</div>
                    <div className="fw-medium text-dark" style={{ fontSize: 13 }}>{fmtDate(order.ngayGiao)}</div>
                  </div>
                  <div className="col-12 border-top pt-1 mt-1">
                    <div className="text-muted mb-0" style={{ fontSize: 11 }}>Tổng giá trị đơn hàng</div>
                    <div className="fw-bold text-primary" style={{ fontSize: 15 }}>{formatCurrency(order.tongTien)} đ</div>
                  </div>
                </div>
              </div>

              {/* Box Kho & QC */}
              <div className="card border-0 p-2 rounded-3 shadow-sm">
                <p className="mb-1" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.02em" }}>
                  Chứng từ Kho & QC
                </p>
                {!hasLogistics && !hasQC ? (
                  <div className="text-muted fst-italic" style={{ fontSize: 11 }}>Không có dữ liệu xuất/nhập kho hoặc QC.</div>
                ) : (
                  <div className="d-flex flex-column gap-1">
                    {lTickets.map((t: any) => (
                      <div key={t.id} className="d-flex align-items-center justify-content-between p-1 px-2 rounded bg-light border">
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: 12 }}>
                            <i className="bi bi-box-seam me-1 text-muted" />{t.code}
                          </div>
                          <div className="text-muted" style={{ fontSize: 10 }}>{t.type === "BATCH_PACKING" ? "Lệnh xuất kho" : t.type} • {fmtDate(t.createdAt)}</div>
                        </div>
                        <div style={{ transform: "scale(0.9)" }}>
                          {getTicketStatusBadge(t.status)}
                        </div>
                      </div>
                    ))}
                    {qcTickets.map((q: any) => (
                      <div key={q.id} className="d-flex align-items-center justify-content-between p-1 px-2 rounded bg-light border">
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: 12 }}>
                            <i className="bi bi-shield-check me-1 text-muted" />{q.code}
                          </div>
                          <div className="text-muted" style={{ fontSize: 10 }}>QC Ticket • {fmtDate(q.createdAt)}</div>
                        </div>
                        <div style={{ transform: "scale(0.9)" }}>
                          {getQcStatusBadge(q.result)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Box Sản phẩm */}
              <div className="card border-0 p-0 rounded-3 shadow-sm overflow-hidden mb-2">
                <div className="bg-white p-2 border-bottom">
                  <p className="mb-0" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.02em" }}>
                    Danh sách hàng hoá ({order.items?.length || 0})
                  </p>
                </div>
                <div className="table-responsive">
                  <table className="table table-borderless table-sm mb-0 align-middle">
                    <thead className="bg-light text-muted" style={{ fontSize: 10 }}>
                      <tr>
                        <th className="ps-2 py-1 fw-medium">Tên hàng hoá</th>
                        <th className="py-1 fw-medium text-center">SL</th>
                        <th className="pe-2 py-1 fw-medium text-end">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: 12 }}>
                      {order.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-bottom border-light">
                          <td className="ps-2 py-1">
                            <div className="fw-medium text-dark">{item.tenHang}</div>
                            {item.inventoryItem?.code && (
                              <div className="text-muted" style={{ fontSize: 10 }}>Mã: {item.inventoryItem.code}</div>
                            )}
                          </td>
                          <td className="py-1 text-center">{item.soLuong}</td>
                          <td className="pe-2 py-1 text-end fw-medium">{formatCurrency(item.thanhTien)}</td>
                        </tr>
                      ))}
                      {order.items?.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-3 text-muted" style={{ fontSize: 11 }}>Không có sản phẩm nào</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-5 text-muted">
              Không tìm thấy dữ liệu.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
