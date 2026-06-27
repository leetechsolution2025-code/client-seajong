"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

export interface OrderDetail {
  id: string;
  code: string | null;
  customerId: string | null;
  ngayDat: string | null;
  ngayGiao: string | null;
  trangThai: string;
  tongTien: number;
  daThanhToan: number;
  keToanDuyet: string;
  trangThaiKho: string;
  ghiChu: string | null;
  nguoiPhuTrach: string | null;
  createdAt: string;
  purchaseRequestCode?: string | null;
  stockMovementCode?: string | null;
  hasLệnhXuatKho?: boolean;
  items?: any[];
  customer: {
    id: string | null;
    name: string;
    dienThoai?: string | null;
    address?: string | null;
  } | null;
}

interface Props {
  orderId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const ACCT_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "Chờ duyệt", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "bi-hourglass-split" },
  approved: { label: "Đã duyệt", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "bi-patch-check-fill" },
  rejected: { label: "Từ chối", color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: "bi-x-circle-fill" },
};

const KHO_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  in_stock: { label: "Đủ hàng", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "bi-check-circle-fill" },
  out_of_stock: { label: "Thiếu hàng", color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: "bi-exclamation-triangle-fill" },
};

const ORDER_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  active: { label: "Đang thực hiện", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: "bi-activity" },
  done: { label: "Hoàn thành", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "bi-check-all" },
  completed: { label: "Hoàn thành", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "bi-check-all" },
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ChiTietDonHang({ orderId, onClose, onSaved }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Modals state
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  // Edit form states
  const [editNgayGiao, setEditNgayGiao] = useState("");
  const [editDaThanhToan, setEditDaThanhToan] = useState(0);
  const [editTrangThai, setEditTrangThai] = useState("active");
  const [editGhiChu, setEditGhiChu] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    setLoading(true);
    fetch(`/api/plan-finance/sales/${orderId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => {
        console.error("Lỗi tải chi tiết đơn hàng", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId]);

  useEffect(() => {
    if (order) {
      setEditNgayGiao(order.ngayGiao ? new Date(order.ngayGiao).toISOString().slice(0, 10) : "");
      setEditDaThanhToan(order.daThanhToan || 0);
      setEditTrangThai(order.trangThai || "active");
      setEditGhiChu(order.ghiChu || "");
    }
  }, [order]);

  if (!orderId) return null;

  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const conNo = order ? Math.max(0, order.tongTien - order.daThanhToan) : 0;

  const acctSt = order ? (ACCT_STATUS_CFG[order.keToanDuyet] ?? { label: order.keToanDuyet, color: "#6b7280", icon: "bi-circle", bg: "rgba(0,0,0,0.05)" }) : { label: "", color: "", icon: "", bg: "" };
  const khoSt = order ? (KHO_STATUS_CFG[order.trangThaiKho] ?? { label: order.trangThaiKho, color: "#6b7280", icon: "bi-circle", bg: "rgba(0,0,0,0.05)" }) : { label: "", color: "", icon: "", bg: "" };
  const orderSt = order ? (ORDER_STATUS_CFG[order.trangThai] ?? { label: order.trangThai, color: "#3b82f6", icon: "bi-activity", bg: "rgba(59,130,246,0.1)" }) : { label: "", color: "", icon: "", bg: "" };

  const handleSaveEdit = async () => {
    if (!orderId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/plan-finance/sales/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngayGiao: editNgayGiao || null,
          daThanhToan: editDaThanhToan,
          trangThai: editTrangThai,
          ghiChu: editGhiChu,
        }),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      
      setOrder(prev => prev ? {
        ...prev,
        ngayGiao: editNgayGiao || null,
        daThanhToan: editDaThanhToan,
        trangThai: editTrangThai,
        ghiChu: editGhiChu,
      } : null);

      toast.success("Thành công", "Cập nhật đơn hàng thành công!");
      setShowEdit(false);
      onSaved?.();
    } catch (err) {
      toast.error("Lỗi", "Không thể cập nhật đơn hàng.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/plan-finance/sales/${orderId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Xoá thất bại");
      
      toast.success("Thành công", "Đã xoá đơn hàng thành công!");
      setShowConfirmDelete(false);
      onClose();
      onSaved?.();
    } catch (err) {
      toast.error("Lỗi", "Không thể xoá đơn hàng.");
    } finally {
      setDeleting(false);
    }
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
        <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Chi tiết đơn hàng</p>
              <p style={{ margin: "0 0 6px", fontFamily: "monospace", fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>{order?.code ?? "—"}</p>
              
              {order && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: orderSt.bg, color: orderSt.color, border: `1px solid ${orderSt.color}40` }}>
                    <i className={`bi ${orderSt.icon}`} style={{ fontSize: 9 }} />{orderSt.label}
                  </span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0 }}>
              <i className="bi bi-x" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "var(--muted-foreground)" }}>
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
              <span style={{ fontSize: 12.5 }}>Đang tải thông tin đơn hàng...</span>
            </div>
          ) : order ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Customer Box */}
              {order.customer && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", borderRadius: 12, border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)" }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.02em" }}>Khách hàng mua hàng</p>
                  <div>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>{order.customer.name}</p>
                    {order.customer.address && (
                      <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--muted-foreground)" }}>
                        <i className="bi bi-geo-alt" style={{ marginRight: 5 }} />{order.customer.address}
                      </p>
                    )}
                    {order.customer.dienThoai && (
                      <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
                        <i className="bi bi-telephone" style={{ marginRight: 5 }} />{order.customer.dienThoai}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Status Section */}
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", letterSpacing: "0.02em" }}>Trạng thái xử lý</p>
                
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, color: "var(--foreground)", fontWeight: 500 }}>Kế toán duyệt:</span>
                  {acctSt && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: acctSt.bg, color: acctSt.color, border: `1px solid ${acctSt.color}25` }}>
                      <i className={`bi ${acctSt.icon}`} /> {acctSt.label}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, color: "var(--foreground)", fontWeight: 500 }}>Trạng thái kho:</span>
                  {khoSt && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: khoSt.bg, color: khoSt.color, border: `1px solid ${khoSt.color}25` }}>
                      <i className={`bi ${khoSt.icon}`} /> {khoSt.label}
                    </span>
                  )}
                </div>

                {/* Additional processing status documents */}
                {(order.purchaseRequestCode || order.stockMovementCode || order.hasLệnhXuatKho) && (
                  <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 10, marginTop: 4, display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                    {order.purchaseRequestCode && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                        <i className="bi bi-file-earmark-arrow-down-fill" style={{ fontSize: 14 }} />
                        <span>Đã gửi yêu cầu mua hàng số <strong style={{ fontFamily: "monospace", fontSize: 12.5 }}>{order.purchaseRequestCode}</strong></span>
                      </div>
                    )}
                    {order.stockMovementCode ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(16, 185, 129, 0.08)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                        <i className="bi bi-box-seam-fill" style={{ fontSize: 14 }} />
                        <span>Đã xuất kho số <strong style={{ fontFamily: "monospace", fontSize: 12.5 }}>{order.stockMovementCode}</strong></span>
                      </div>
                    ) : order.hasLệnhXuatKho ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(59, 130, 246, 0.08)", color: "#3b82f6", border: "1px solid rgba(59, 130, 246, 0.15)" }}>
                        <i className="bi bi-send-check-fill" style={{ fontSize: 14 }} />
                        <span>Đã gửi lệnh xuất kho số <strong style={{ fontFamily: "monospace", fontSize: 12.5 }}>{order.code}</strong></span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Date & staff Info */}
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", letterSpacing: "0.02em" }}>Thông tin thời gian & nhân sự</p>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span className="text-secondary">Ngày đặt hàng:</span>
                  <span className="fw-semibold text-dark">{fmtDate(order.ngayDat)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span className="text-secondary">Ngày giao hàng:</span>
                  <span className="fw-semibold text-dark">{fmtDate(order.ngayGiao)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span className="text-secondary">Người tạo đơn:</span>
                  <span className="fw-semibold text-dark">{order.nguoiPhuTrach || "Hệ thống"}</span>
                </div>
              </div>

              {/* Finance Box */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", background: "rgba(0,0,0,0.02)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", letterSpacing: "0.02em" }}>Giá trị & Thanh toán</p>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span className="text-secondary">Tổng tiền hàng:</span>
                  <span className="fw-bold text-dark">{fmt(order.tongTien)} ₫</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span className="text-secondary">Đã thanh toán:</span>
                  <span className="fw-bold text-success">{fmt(order.daThanhToan)} ₫</span>
                </div>

                <div style={{ borderTop: "1px dashed var(--border)", margin: "4px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span className="fw-bold text-dark">Còn lại (công nợ):</span>
                  <span className={`fw-extrabold ${conNo > 0 ? "text-danger" : "text-success"}`}>{fmt(conNo)} ₫</span>
                </div>
              </div>

              {/* Ghi chú */}
              {order.ghiChu && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Ghi chú đơn hàng</label>
                  <div style={{ padding: "10px 12px", background: "var(--muted)", borderRadius: 8, fontSize: 12.5, color: "var(--foreground)", whiteSpace: "pre-line" }}>
                    {order.ghiChu}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)" }}>
              <i className="bi bi-inbox" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 13 }}>Không tìm thấy thông tin đơn hàng</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {order && (
          <div style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            background: "var(--card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexShrink: 0
          }}>
            <button
              onClick={() => setShowPrint(true)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--muted)",
                color: "var(--foreground)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <i className="bi bi-printer" />
              In đơn hàng
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setShowEdit(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--primary)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <i className="bi bi-pencil" />
                Sửa
              </button>

              <button
                onClick={() => setShowConfirmDelete(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  background: "rgba(239, 68, 68, 0.08)",
                  color: "#ef4444",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <i className="bi bi-trash3" />
                Xoá
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      {showEdit && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 1201, width: 420, background: "var(--card)",
            borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            border: "1px solid var(--border)", overflow: "hidden",
            display: "flex", flexDirection: "column"
          }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Sửa thông tin đơn hàng</p>
              <button onClick={() => setShowEdit(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)", lineHeight: 1 }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Ngày giao hàng</label>
                <input type="date" value={editNgayGiao} onChange={e => setEditNgayGiao(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Số tiền đã thanh toán (₫)</label>
                <input type="number" value={editDaThanhToan} onChange={e => setEditDaThanhToan(parseFloat(e.target.value) || 0)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Trạng thái đơn hàng</label>
                <select value={editTrangThai} onChange={e => setEditTrangThai(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box" }}
                >
                  <option value="active">Đang thực hiện</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Ghi chú đơn hàng</label>
                <textarea value={editGhiChu} onChange={e => setEditGhiChu(e.target.value)}
                  placeholder="Ghi chú thêm về đơn hàng..."
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowEdit(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >Huỷ</button>
              <button onClick={handleSaveEdit} disabled={saving}
                style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                {saving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} /> : <i className="bi bi-check2" />}Lưu thay đổi
              </button>
            </div>
          </div>
        </>
      )}

      {showConfirmDelete && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 1201, width: 380, background: "var(--card)",
            borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            border: "1px solid var(--border)", overflow: "hidden",
          }}>
            <div style={{ padding: "24px 24px 16px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <i className="bi bi-trash3-fill" style={{ fontSize: 22, color: "#ef4444" }} />
              </div>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15, color: "var(--foreground)" }}>Xác nhận xoá đơn hàng</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
                Bạn sắp xoá đơn hàng <strong style={{ color: "var(--foreground)" }}>{order?.code || order?.id}</strong>.<br />
                Mọi thông tin công nợ liên quan cũng sẽ bị xoá bỏ. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div style={{ padding: "0 24px 20px", display: "flex", gap: 10 }}>
              <button onClick={() => setShowConfirmDelete(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >Huỷ</button>
              <button onClick={handleDeleteOrder} disabled={deleting}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} /> : <i className="bi bi-trash3" />}
                {deleting ? "Đang xoá..." : "Xác nhận xoá"}
              </button>
            </div>
          </div>
        </>
      )}

      {showPrint && order && (
        <PrintPreviewModal
          title={`Đơn bán hàng ${order.code || order.id}`}
          subtitle={`${fmtDate(order.ngayDat)} • Khách hàng: ${order.customer?.name || "Khách vãng lai"}`}
          onClose={() => setShowPrint(false)}
          printOrientation="portrait"
          actions={
            <button
              onClick={() => printDocumentById("print-doc")}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 3px 10px rgba(59,130,246,0.3)"
              }}
            >
              <i className="bi bi-printer-fill" /> In ngay
            </button>
          }
          document={
            <div className="pdf-cover-page" style={{ padding: "50px 60px", width: "100%", fontFamily: "'Montserrat', 'Open Sans', Arial, sans-serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
                {/* Logo + Company Info */}
                <div style={{ display: "flex", gap: 16, maxWidth: "55%" }}>
                  <div style={{ width: 80, height: 80, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
                    <i className="bi bi-house-door-fill" style={{ fontSize: 40 }} />
                    <span style={{ fontSize: 8, fontWeight: 800 }}>SEAJONG FAUCET</span>
                  </div>
                  <div>
                    <h1 style={{ margin: "0 0 6px 0", fontSize: 13, fontWeight: 900, color: "#3b82f6", textTransform: "uppercase" }}>CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM</h1>
                    <p style={{ margin: "0 0 4px 0", fontSize: 9, color: "#1e293b" }}><strong>Địa chỉ:</strong> Khu công nghiệp Tân Quang, Văn Lâm, Hưng Yên</p>
                    <p style={{ margin: "0 0 4px 0", fontSize: 9, color: "#1e293b" }}><strong>SĐT:</strong> 0988 888 888</p>
                  </div>
                </div>

                {/* Title */}
                <div style={{ textAlign: "right", maxWidth: "40%" }}>
                  <h2 style={{ margin: "0 0 4px 0", fontSize: 20, fontWeight: 900, color: "#1e293b", textTransform: "uppercase" }}>ĐƠN BÁN HÀNG BÁN LẺ</h2>
                  <p style={{ margin: "0 0 2px 0", fontSize: 11, color: "#1e293b" }}><strong>Số đơn:</strong> <span style={{ color: "#3b82f6", fontWeight: 700 }}>{order.code || order.id}</span></p>
                  <p style={{ margin: "0 0 2px 0", fontSize: 10, color: "#64748b" }}>Ngày lập: {fmtDate(order.ngayDat)}</p>
                </div>
              </div>

              {/* Customer Box */}
              <div style={{ marginBottom: 20 }}>
                 <table style={{ fontSize: 12, color: "#1e293b", width: "100%", lineHeight: 1.8 }}>
                   <tbody>
                     <tr>
                       <td style={{ width: 100, fontWeight: 600 }}>Khách hàng:</td>
                       <td><strong>{order.customer?.name || "Khách vãng lai"}</strong></td>
                     </tr>
                     {order.customer?.dienThoai && (
                       <tr>
                         <td style={{ fontWeight: 600 }}>Số điện thoại:</td>
                         <td>{order.customer.dienThoai}</td>
                       </tr>
                     )}
                     {order.customer?.address && (
                       <tr>
                         <td style={{ fontWeight: 600 }}>Địa chỉ:</td>
                         <td>{order.customer.address}</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
              </div>

              {/* The Items Table */}
              {order.items && order.items.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #1e293b", marginBottom: 24 }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #1e293b", padding: "8px 6px", textAlign: "center", width: 40, background: "#f8fafc", color: "var(--foreground)" }}>STT</th>
                      <th style={{ border: "1px solid #1e293b", padding: "8px 12px", textAlign: "left", background: "#f8fafc", color: "var(--foreground)" }}>Tên sản phẩm, dịch vụ</th>
                      <th style={{ border: "1px solid #1e293b", padding: "8px 6px", textAlign: "center", width: 60, background: "#f8fafc", color: "var(--foreground)" }}>ĐVT</th>
                      <th style={{ border: "1px solid #1e293b", padding: "8px 6px", textAlign: "center", width: 60, background: "#f8fafc", color: "var(--foreground)" }}>Số lượng</th>
                      <th style={{ border: "1px solid #1e293b", padding: "8px 6px", textAlign: "right", width: 95, background: "#f8fafc", color: "var(--foreground)" }}>Đơn giá (đ)</th>
                      <th style={{ border: "1px solid #1e293b", padding: "8px 6px", textAlign: "right", width: 110, background: "#f8fafc", color: "var(--foreground)" }}>Thành tiền (đ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((line: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ border: "1px solid #1e293b", padding: "8px 6px", textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ border: "1px solid #1e293b", padding: "8px 12px" }}>{line.tenHang}</td>
                        <td style={{ border: "1px solid #1e293b", padding: "8px 6px", textAlign: "center" }}>{line.donVi || "cái"}</td>
                        <td style={{ border: "1px solid #1e293b", padding: "8px 6px", textAlign: "center" }}>{line.soLuong}</td>
                        <td style={{ border: "1px solid #1e293b", padding: "8px 6px", textAlign: "right" }}>{line.donGia.toLocaleString("vi-VN")}</td>
                        <td style={{ border: "1px solid #1e293b", padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>{line.thanhTien.toLocaleString("vi-VN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: "20px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 8, marginBottom: 24, fontSize: 12, color: "var(--muted-foreground)" }}>
                  Không có chi tiết sản phẩm cho đơn hàng này.
                </div>
              )}

              {/* Payment Summary */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                 <table style={{ width: "300px", fontSize: 12, color: "#1e293b", lineHeight: 2.0 }}>
                   <tbody>
                     <tr>
                       <td style={{ fontWeight: 600 }}>Tổng tiền hàng:</td>
                       <td style={{ textAlign: "right", fontWeight: 800 }}>{order.tongTien.toLocaleString("vi-VN")} đ</td>
                     </tr>
                     <tr>
                       <td style={{ fontWeight: 600, color: "#10b981" }}>Đã thanh toán:</td>
                       <td style={{ textAlign: "right", fontWeight: 800, color: "#10b981" }}>{order.daThanhToan.toLocaleString("vi-VN")} đ</td>
                     </tr>
                     <tr style={{ borderTop: "1px dashed #cbd5e1" }}>
                       <td style={{ fontWeight: 800, fontSize: 13 }}>Còn lại (công nợ):</td>
                       <td style={{ textAlign: "right", fontWeight: 800, fontSize: 13, color: conNo > 0 ? "#ef4444" : "#10b981" }}>{conNo.toLocaleString("vi-VN")} đ</td>
                     </tr>
                   </tbody>
                 </table>
              </div>
            </div>
          }
        />
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
