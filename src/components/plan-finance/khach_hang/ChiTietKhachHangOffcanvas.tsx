"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CareHistoryTimeline, type CareHistoryItem } from "@/components/ui/CareHistoryTimeline";
import { ThemKetQuaChamSocModal } from "@/components/plan-finance/khach_hang/ThemKetQuaChamSocModal";

// ── Types ─────────────────────────────────────────────────────────────────────
type EmployeeOption = { id: string; fullName: string };

export type CustomerRow = {
  id: string; name: string; nhom: string | null; nguon: string | null;
  dienThoai: string | null; email: string | null;
  address: string | null; daiDien: string | null; xungHo: string | null;
  chucVu: string | null; ghiChu: string | null;
  nguoiChamSoc: { id: string; fullName: string } | null;
  nguoiChamSocId: string | null;
  createdAt: string;
};

const NHOM_LABEL: Record<string, string> = {
  "ca-nhan": "Cá nhân", "doanh-nghiep": "Doanh nghiệp",
  "doi-tac": "Đối tác", "khach-le": "Khách lẻ",
};
const NGUON_LABEL: Record<string, string> = {
  "tu-nhien": "Tự nhiên", "gioi-thieu": "Giới thiệu",
  "quang-cao": "Quảng cáo", "khac": "Khác",
};

const nhomColor: Record<string, string> = {
  "ca-nhan": "#6366f1", "doanh-nghiep": "#10b981",
  "doi-tac": "#f59e0b", "khach-le": "#06b6d4",
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  customer: CustomerRow | null;
  onClose: () => void;
  onDeleted: () => void;
  onEdit: () => void;
  onQuote?: () => void;
  employees: EmployeeOption[];
  /** Employee.id của người đang đăng nhập. Nếu khớp với nguoiChamSocId mới được phép sửa/xóa. */
  currentUserEmployeeId?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ChiTietKhachHangOffcanvas({ customer, onClose, onDeleted, onEdit, onQuote, employees, currentUserEmployeeId }: Props) {
  const open = !!customer;
  const toast = useToast();
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [addActOpen, setAddActOpen] = React.useState(false);
  const [careHistory, setCareHistory] = React.useState<CareHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  // Kiểm tra người đăng nhập có phải người phụ trách không
  // Chỉ để kiểm soát nút "+ Hoạt động"
  const isOwner = !!currentUserEmployeeId && currentUserEmployeeId === customer?.nguoiChamSocId;

  // Fetch lịch sử chăm sóc mỗi khi mở offcanvas KH khác
  React.useEffect(() => {
    if (!customer) return;
    setHistoryLoading(true);
    fetch(`/api/plan-finance/customers/${customer.id}/care-history`)
      .then(r => r.json())
      .then((data: Array<{ id: string; ngayChamSoc: string; hinhThuc: string; tomTat: string; nguoiChamSoc?: { fullName: string } | null }>) => {
        const HINH_THUC_TYPE: Record<string, string> = {
          "goi-dien": "call", "gap-mat": "meeting",
          "nhan-tin": "message",
          "email": "email", "khac": "note",
        };
        setCareHistory(data.map(r => ({
          id: r.id,
          date: new Date(r.ngayChamSoc).toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit",
            year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
          }),
          rawDate: r.ngayChamSoc,
          type: HINH_THUC_TYPE[r.hinhThuc] ?? "note",
          note: r.tomTat,
          user: r.nguoiChamSoc?.fullName ?? "Nhân viên",
        })));
      })
      .catch(() => { })
      .finally(() => setHistoryLoading(false));
  }, [customer?.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/plan-finance/customers/${customer!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa thất bại");
      toast.success("Đã xoá", `Khách hàng "${customer!.name}" đã được xoá khỏi hệ thống`);
      setConfirmOpen(false);
      onClose();
      onDeleted();
    } catch (e) {
      toast.error("Xoá thất bại", e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setDeleting(false); }
  };

  const handleDeleteHistory = async (historyId: string) => {
    const res = await fetch(
      `/api/plan-finance/customers/${customer!.id}/care-history/${historyId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const d = await res.json();
      toast.error("Xóa thất bại", d.error ?? "Lỗi không xác định");
      throw new Error(d.error);
    }
    setCareHistory(h => h.filter(item => item.id !== historyId));
    toast.success("Đã xoá", "Hoạt động chăm sóc đã được xoá");
  };

  return (
    <>
      <ThemKetQuaChamSocModal
        open={addActOpen}
        onClose={() => setAddActOpen(false)}
        onSaved={item => setCareHistory(h => [item, ...h])}
        defaultNguoiChamSoc={customer?.nguoiChamSocId ?? ""}
        employees={employees}
        customerId={customer?.id ?? null}
        lastCare={careHistory[0] ?? null}
      />

      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Xóa khách hàng"
        message={`Bạn có chắc chắn muốn xóa khách hàng "${customer?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa khách hàng"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1040 }}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1050, minWidth: 400, maxWidth: 400, background: "var(--card)", boxShadow: "-6px 0 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column" }}
            >
              {/* Header */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Chi tiết khách hàng</p>
                <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
                  <i className="bi bi-x" style={{ fontSize: 16 }} />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

                {/* Info cố định */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>

                    {/* Avatar + Tên */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                        background: `color-mix(in srgb, ${nhomColor[customer?.nhom ?? ""] ?? "var(--primary)"} 18%, var(--background))`,
                        border: `2px solid color-mix(in srgb, ${nhomColor[customer?.nhom ?? ""] ?? "var(--primary)"} 35%, transparent)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, fontWeight: 800,
                        color: nhomColor[customer?.nhom ?? ""] ?? "var(--primary)",
                      }}>
                        {(customer?.name ?? "?").trim().split(" ").pop()?.[0]?.toUpperCase() ?? "?"}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "var(--foreground)", lineHeight: 1.3 }}>{customer?.name}</p>

                        {/* Địa chỉ, SĐT, Email */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 5 }}>
                          {customer?.address && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <i className="bi bi-geo-alt" style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customer.address}</span>
                            </div>
                          )}
                          {customer?.dienThoai && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <i className="bi bi-telephone" style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{customer.dienThoai}</span>
                            </div>
                          )}
                          {customer?.email && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <i className="bi bi-envelope" style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customer.email}</span>
                            </div>
                          )}
                        </div>

                        {/* Nhóm + nguồn + ngày tạo */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                          {customer?.nhom && (
                            <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `color-mix(in srgb, ${nhomColor[customer.nhom] ?? "#94a3b8"} 12%, transparent)`, color: nhomColor[customer.nhom] ?? "#94a3b8" }}>
                              {NHOM_LABEL[customer.nhom] ?? customer.nhom}
                            </span>
                          )}
                          {customer?.nguon && (
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                              · {NGUON_LABEL[customer.nguon] ?? customer.nguon}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: "auto" }}>
                            {customer?.createdAt ? new Date(customer.createdAt).toLocaleDateString("vi-VN") : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Người phụ trách */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                      <i className="bi bi-person-check" style={{ fontSize: 12, color: "var(--muted-foreground)", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>Phụ trách:</span>
                      <span style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 600 }}>
                        {customer?.nguoiChamSoc?.fullName ?? "Chưa phân công"}
                      </span>
                    </div>

                    {/* Hạn mức nợ */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, padding: "7px 10px", borderRadius: 8, background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="bi bi-cash-stack" style={{ fontSize: 13, color: "#f59e0b" }} />
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>Hạn mức nợ:</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>0 đồng</span>
                      </div>
                      <button style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
                        Mở hạn mức
                      </button>
                    </div>

                    {/* Nút hành động */}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>

                      {/* Xoá: luôn enabled */}
                      <button
                        onClick={() => setConfirmOpen(true)}
                        disabled={deleting}
                        title="Xoá khách hàng"
                        style={{ width: 36, height: 36, border: "1.5px solid #f43f5e", background: "transparent", color: "#f43f5e", fontSize: 15, cursor: deleting ? "not-allowed" : "pointer", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", opacity: deleting ? 0.6 : 1, flexShrink: 0 }}
                      >
                        <i className="bi bi-trash" />
                      </button>

                      {/* Sửa: luôn enabled */}
                      <button
                        onClick={() => onEdit()}
                        title="Chỉnh sửa"
                        style={{ width: 36, height: 36, border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 15, cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
                      >
                        <i className="bi bi-pencil" />
                      </button>

                      <button
                        onClick={isOwner ? () => { onClose(); if (onQuote) setTimeout(onQuote, 50); } : undefined}
                        disabled={!isOwner}
                        title={!isOwner ? "Chỉ người phụ trách mới được tạo báo giá" : "Tạo báo giá"}
                        style={{
                          flex: 1, padding: "8px", border: "none",
                          background: isOwner ? "var(--primary)" : "var(--muted)",
                          color: isOwner ? "#fff" : "var(--muted-foreground)",
                          fontSize: 13, fontWeight: 600,
                          cursor: isOwner ? "pointer" : "not-allowed",
                          borderRadius: 8,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                          opacity: isOwner ? 1 : 0.5,
                          transition: "all 0.15s",
                        }}
                      >
                        <i className="bi bi-file-text" /> Báo giá
                      </button>
                      <button onClick={onClose}
                        style={{ padding: "8px 16px", border: "1.5px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.15s" }}
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lịch sử chăm sóc */}
                <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <CareHistoryTimeline
                    history={[
                      ...careHistory,
                      ...(customer?.createdAt ? [{
                        id: "__created__",
                        rawDate: customer.createdAt,
                        date: new Date(customer.createdAt).toLocaleString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit",
                          year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
                        }),
                        type: "note",
                        note: "Khách hàng được tạo trong hệ thống",
                        user: "Hệ thống",
                      }] : []),
                    ]}
                    onAdd={isOwner ? () => setAddActOpen(true) : undefined}
                    onDelete={handleDeleteHistory}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


    </>
  );
}

// ── Quotation Modal (lazy wrapper - gọi từ page gốc qua prop nếu cần) ────────
// Tạm thời dùng inline đơn giản. TODO: import từ @/components/plan-finance/QuotationModal
function QuotationModalLazy({ open, onClose, customerId, customerName }: {
  open: boolean; onClose: () => void; customerId: string; customerName: string;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--card)", borderRadius: 16, padding: 32, minWidth: 320, textAlign: "center" }}>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>Tạo báo giá cho {customerName}</p>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 20 }}>Chức năng đang được tích hợp từ component QuotationModal.</p>
        <button onClick={onClose} style={{ padding: "8px 24px", border: "1.5px solid var(--border)", borderRadius: 8, cursor: "pointer", background: "var(--muted)" }}>Đóng</button>
      </div>
    </div>
  );
}
