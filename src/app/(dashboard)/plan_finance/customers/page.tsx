"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Table } from "@/components/ui/Table";
import { Timeline } from "@/components/ui/Timeline";
import { CareHistoryTimeline, type CareHistoryItem } from "@/components/ui/CareHistoryTimeline";
import { genDocCode } from "@/lib/genDocCode";
import { ThemKetQuaChamSocModal } from "@/components/plan-finance/khach_hang/ThemKetQuaChamSocModal";
import { ChiTietKhachHangOffcanvas } from "@/components/plan-finance/khach_hang/ChiTietKhachHangOffcanvas";
import { TaoKhachHangMoiModal } from "@/components/plan-finance/khach_hang/TaoKhachHangMoiModal";
import { KeHoachChamSocOffcanvas } from "@/components/plan-finance/khach_hang/KeHoachChamSocOffcanvas";
import { BaoGiaSanitaryModal } from "@/components/plan-finance/bao_gia/BaoGiaSanitaryModal";

// ── Helpers ──────────────────────────────────────────────────────────────────
const todayISO = new Date().toISOString().split("T")[0];

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 5 }}>
    {text}{required && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", transition: "border-color 0.15s, box-shadow 0.15s", ...props.style }}
    onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)"; }}
    onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
  />
);

const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} style={{ width: "100%", padding: "8px 28px 8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, cursor: "pointer", appearance: "none", outline: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 16 16'%3E%3Cpath fill='%23888' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", ...props.style }}
    onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
    onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
  >{children}</select>
);

// ── Types ─────────────────────────────────────────────────────────────────────
type EmployeeOption = { id: string; fullName: string };

type CustomerRow = {
  id: string; name: string; nhom: string | null; nguon: string | null;
  dienThoai: string | null; email: string | null;
  address: string | null; daiDien: string | null; xungHo: string | null;
  chucVu: string | null; ghiChu: string | null;
  nguoiChamSoc: { id: string; fullName: string } | null;
  nguoiChamSocId: string | null;
  createdAt: string;
};

type KpiStats = {
  totalCustomers: number;
  newCustomersThisYear: number;
  customersByNguon: { label: string; value: number }[];
  customersByNhom: { label: string; value: number }[];
};

type CategoryOption = { id: string; code: string; name: string };

function EditCustomerModal({ open, customer, onClose, onSaved, employees, nguonOptions, nhomOptions }: {
  open: boolean;
  customer: CustomerRow | null;
  onClose: () => void;
  onSaved: (updated: CustomerRow) => void;
  employees: EmployeeOption[];
  nguonOptions: CategoryOption[];
  nhomOptions: CategoryOption[];
}) {
  const toast = useToast();

  const [form, setForm] = React.useState({
    nguoiChamSocId: "", nguon: "", nhom: "",
    ten: "", diaChi: "", daiDien: "", xungHo: "Anh", chucVu: "",
    dienThoai: "", email: "", ghiChu: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // Pre-fill khi mở
  React.useEffect(() => {
    if (open && customer) {
      setForm({
        nguoiChamSocId: customer.nguoiChamSocId ?? "",
        nguon: customer.nguon ?? "",
        nhom: customer.nhom ?? "",
        ten: customer.name ?? "",
        diaChi: customer.address ?? "",
        daiDien: customer.daiDien ?? "",
        xungHo: customer.xungHo ?? "Anh",
        chucVu: customer.chucVu ?? "",
        dienThoai: customer.dienThoai ?? "",
        email: customer.email ?? "",
        ghiChu: customer.ghiChu ?? "",
      });
      setError("");
      setSaving(false);
    }
  }, [open, customer]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.nguon) { setError("Vui lòng chọn nguồn"); return; }
    setSaving(true); setError("");
    try {
      const isPersonal = form.nhom === "ca-nhan" || form.nhom === "khach-le";
      const resolvedName = (!isPersonal && form.ten.trim()) ? form.ten.trim() : (form.daiDien.trim() || customer!.name);
      const res = await fetch(`/api/plan-finance/customers/${customer!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: resolvedName, address: form.diaChi, nguon: form.nguon, nhom: form.nhom,
          daiDien: form.daiDien, xungHo: form.xungHo, chucVu: form.chucVu,
          dienThoai: form.dienThoai, email: form.email, ghiChu: form.ghiChu,
          nguoiChamSocId: form.nguoiChamSocId || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi cập nhật"); }
      const updated = await res.json();
      toast.success("Cập nhật thành công", `"Đã lưu thông tin khách hàng ${resolvedName}"`);
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      setError(msg);
      toast.error("Cập nhật thất bại", msg);
    }
    finally { setSaving(false); }
  };

  const personalCodes = nhomOptions.filter(o => ["ca-nhan", "khach-le"].includes(o.code)).map(o => o.code);
  const isPersonal = personalCodes.includes(form.nhom) || form.nhom === "ca-nhan" || form.nhom === "khach-le";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000 }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: "fixed", inset: 0, margin: "auto", zIndex: 2001, width: "min(620px, calc(100vw - 32px))", height: "fit-content", maxHeight: "calc(100vh - 40px)", background: "var(--card)", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in srgb, #6366f1 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-pencil-square" style={{ fontSize: 16, color: "#6366f1" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "var(--foreground)" }}>Chỉnh sửa khách hàng</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>{customer?.name}</p>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-x" style={{ fontSize: 18 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label text="Nguồn" required />
                  <Select value={form.nguon} onChange={set("nguon")}>
                    <option value="">Chọn nguồn...</option>
                    {nguonOptions.map(o => (
                      <option key={o.id} value={o.code}>{o.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label text="Nhóm khách hàng" />
                  <Select value={form.nhom} onChange={set("nhom")}>
                    <option value="">Chọn nhóm...</option>
                    {nhomOptions.map(o => (
                      <option key={o.id} value={o.code}>{o.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div style={isPersonal ? { opacity: 0.45, pointerEvents: "none" } : {}}>
                <Label text="Tên khách hàng" />
                <Input placeholder={isPersonal ? "Tên theo Đại diện..." : "Tên khách hàng..."} value={form.ten} onChange={set("ten")} disabled={isPersonal} />
              </div>

              <div><Label text="Địa chỉ" /><Input placeholder="Địa chỉ..." value={form.diaChi} onChange={set("diaChi")} /></div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: 12 }}>
                <div><Label text="Đại diện" /><Input placeholder="Họ và tên đại diện..." value={form.daiDien} onChange={set("daiDien")} /></div>
                <div>
                  <Label text="Xưng hô" />
                  <Select value={form.xungHo} onChange={set("xungHo")}>
                    <option>Anh</option><option>Chị</option><option>Ông</option><option>Bà</option>
                  </Select>
                </div>
                <div style={isPersonal ? { opacity: 0.45, pointerEvents: "none" } : {}}>
                  <Label text="Chức vụ" /><Input placeholder="Chức vụ..." value={form.chucVu} onChange={set("chucVu")} disabled={isPersonal} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><Label text="Điện thoại" /><Input type="tel" placeholder="Số điện thoại..." value={form.dienThoai} onChange={set("dienThoai")} /></div>
                <div><Label text="Email" /><Input type="email" placeholder="Địa chỉ email..." value={form.email} onChange={set("email")} /></div>
              </div>

              <div>
                <Label text="Người chăm sóc" />
                <Select value={form.nguoiChamSocId} onChange={set("nguoiChamSocId")}>
                  <option value="">Chưa phân công</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </Select>
              </div>

              <div>
                <Label text="Ghi chú" />
                <textarea rows={3} placeholder="Ghi chú..." value={form.ghiChu}
                  onChange={e => setForm(f => ({ ...f, ghiChu: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", transition: "border-color 0.15s" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              {error && <p style={{ margin: 0, fontSize: 12, color: "#f43f5e", textAlign: "right" }}>{error}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ padding: "8px 18px", border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: "var(--radius)" }}>Đóng</button>
                <button onClick={handleSubmit} disabled={saving}
                  style={{ padding: "8px 20px", border: "none", background: saving ? "var(--muted)" : "#6366f1", color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", borderRadius: "var(--radius)", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {saving ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang lưu...</> : <><i className="bi bi-check2" /> Lưu thay đổi</>}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
  <div style={{ flex: 1, background: "var(--card)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <i className={`bi ${icon}`} style={{ fontSize: 18, color }} />
    </div>
    <div>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "var(--foreground)", lineHeight: 1.2 }}>{value}</p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>{label}</p>
    </div>
  </div>
);


// ── Helper: số → chữ (VND) ─────────────────────────────────────────────────


// ── QuotationBadge: hiển thị số BG của KH với dropdown ──────────────────────
const Q_STATUS_CFG: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  draft: { label: "Nháp", color: "#94a3b8", icon: "bi-pencil-square", bg: "rgba(148,163,184,0.1)" },
  pending_approval: { label: "Đang trình duyệt", color: "#f59e0b", icon: "bi-hourglass-split", bg: "rgba(245,158,11,0.1)" },
  sent: { label: "Đang thương thảo", color: "#3b82f6", icon: "bi-send-check-fill", bg: "rgba(59,130,246,0.1)" },
  approved: { label: "Đã phê duyệt", color: "#8b5cf6", icon: "bi-patch-check-fill", bg: "rgba(139,92,246,0.1)" },
  won: { label: "Thành công", color: "#10b981", icon: "bi-trophy-fill", bg: "rgba(16,185,129,0.1)" },
  lost: { label: "Thất bại", color: "#ef4444", icon: "bi-x-circle-fill", bg: "rgba(239,68,68,0.1)" },
  cancelled: { label: "Đã huỷ", color: "#6b7280", icon: "bi-slash-circle-fill", bg: "rgba(107,114,128,0.1)" },
};

// Timeline steps for quotation status progression
const Q_TIMELINE: { status: string; label: string }[] = [
  { status: "draft", label: "Tạo nháp" },
  { status: "pending_approval", label: "Trình duyệt" },
  { status: "approved", label: "Phê duyệt" },
  { status: "sent", label: "Đang thương thảo" },
  { status: "won", label: "Chốt thành công" },
];

type QuotationItem = { id: string; tenHang: string; donVi: string; soLuong: number; donGia: number; thanhTien: number };
type QuotationSummary = {
  id: string; code: string | null; trangThai: string;
  ngayBaoGia: string | null; ngayHetHan: string | null;
  thanhTien: number; tongTien: number; discount: number; vat: number;
  ghiChu: string | null; uuTien: string | null;
  customer?: { id: string; name: string } | null;
  nguoiPhuTrach?: { id: string; fullName: string; position?: string } | null;
  items?: QuotationItem[];
  createdAt?: string;
};

// ── QuotationDetailOffcanvas ───────────────────────────────────────────────────
function QuotationDetailOffcanvas({ q, onClose }: { q: QuotationSummary | null; onClose: () => void }) {
  if (!q) return null;
  const st = Q_STATUS_CFG[q.trangThai] ?? { label: q.trangThai, color: "#94a3b8", icon: "bi-circle", bg: "rgba(0,0,0,0.05)" };
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const fmtDate = (s: string | null | undefined) => s ? new Date(s).toLocaleDateString("vi-VN") : "—";

  // Tính vị trí trên timeline
  const timelineStatuses = ["draft", "pending_approval", "approved", "sent", "won"];
  const currentIdx = timelineStatuses.indexOf(q.trangThai);
  const isLost = q.trangThai === "lost" || q.trangThai === "cancelled";


  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 1099, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }}
      />
      {/* Offcanvas panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1100,
        background: "var(--card)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        borderLeft: "1px solid var(--border)",
        animation: "slideInRight 0.22s ease-out",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          background: "var(--card)", flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
              Chi tiết báo giá
            </p>
            <p style={{ margin: 0, fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: "var(--foreground)" }}>
              {q.code ?? "—"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: st.bg, color: st.color, border: `1px solid ${st.color}40`,
            }}>
              <i className={`bi ${st.icon}`} style={{ fontSize: 11 }} />
              {st.label}
            </span>
            <button onClick={onClose} style={{
              width: 30, height: 30, border: "1px solid var(--border)",
              background: "var(--muted)", borderRadius: 8, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--muted-foreground)",
            }}>
              <i className="bi bi-x" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* ── Timeline tiến trình ── */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: "0 0 14px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
              Tiến trình xử lý
            </p>
            <Timeline
              steps={Q_TIMELINE.map(s => ({ key: s.status, label: s.label, color: Q_STATUS_CFG[s.status]?.color, icon: Q_STATUS_CFG[s.status]?.icon }))}
              currentKey={q.trangThai}
              terminalBanner={isLost ? { icon: st.icon, label: st.label, color: st.color, bg: st.bg, subText: "Báo giá đã kết thúc" } : undefined}
            />
          </div>

          {/* ── Thông tin chung ───────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Ngày lập", val: fmtDate(q.ngayBaoGia) },
              { label: "Hiệu lực đến", val: fmtDate(q.ngayHetHan) },
              { label: "Khách hàng", val: q.customer?.name ?? "—" },
              { label: "Người phụ trách", val: q.nguoiPhuTrach?.fullName ?? "—" },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{val}</p>
              </div>
            ))}
          </div>

          {/* ── Bảng hàng hoá ────────────────────────────────── */}
          {q.items && q.items.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
                Danh sách hàng hoá
              </p>
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      {["Tên hàng hoá", "ĐVT", "SL", "Đơn giá", "Thành tiền"].map(h => (
                        <th key={h} style={{ padding: "7px 10px", textAlign: h === "Tên hàng hoá" ? "left" : "right", fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {q.items.map((it, idx) => (
                      <tr key={it.id} style={{ borderTop: "1px solid var(--border)", background: idx % 2 === 0 ? "transparent" : "var(--muted)" }}>
                        <td style={{ padding: "7px 10px", fontWeight: 600, color: "var(--foreground)" }}>{it.tenHang}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", color: "var(--muted-foreground)" }}>{it.donVi}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{it.soLuong}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(it.donGia)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>{fmt(it.thanhTien)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tổng kết tài chính ───────────────────────────── */}
          <div style={{ background: "var(--muted)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
              Tổng kết
            </p>
            {[
              { label: "Tạm tính", val: fmt(q.tongTien ?? 0) + " ₫" },
              { label: `Chiết khấu (${q.discount ?? 0}%)`, val: "-" + fmt((q.tongTien ?? 0) * (q.discount ?? 0) / 100) + " ₫" },
              { label: `VAT (${q.vat ?? 0}%)`, val: "+" + fmt(((q.tongTien ?? 0) - (q.tongTien ?? 0) * (q.discount ?? 0) / 100) * (q.vat ?? 0) / 100) + " ₫" },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>{label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" }}>{val}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>Tổng cộng</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>{fmt(q.thanhTien ?? 0)} ₫</span>
            </div>
          </div>

          {/* ── Ghi chú ──────────────────────────────────────── */}
          {q.ghiChu && (
            <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#f59e0b" }}>
                <i className="bi bi-sticky-fill" style={{ marginRight: 4 }} /> Ghi chú
              </p>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--foreground)", whiteSpace: "pre-line", lineHeight: 1.6 }}>{q.ghiChu}</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  );
}

function QuotationBadge({ customerId }: { customerId: string }) {
  const [open, setOpen] = React.useState(false);
  const [qList, setQList] = React.useState<QuotationSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetched, setFetched] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Fetch ngay khi mount hoặc customerId thay đổi → hiển thị số liền
  React.useEffect(() => {
    let cancelled = false;
    setFetched(null);
    setQList([]);
    setLoading(true);
    fetch(`/api/plan-finance/quotations?customerId=${customerId}&page=1`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setQList(d.items ?? []); setFetched(customerId); } })
      .catch(() => { })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customerId]);

  const handleToggle = () => setOpen(o => !o);


  return (
    <>
      <div ref={containerRef} style={{ position: "relative" }}>
        <button
          onClick={handleToggle}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 10px", borderRadius: 8, cursor: "pointer",
            background: "color-mix(in srgb, var(--primary) 6%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <i className="bi bi-file-earmark-text" style={{ fontSize: 13, color: "var(--primary)" }} />
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>Số báo giá:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
              {loading
                ? <i className="bi bi-arrow-repeat" style={{ fontSize: 11, animation: "spin 0.8s linear infinite" }} />
                : qList.length
              }
            </span>
          </div>
          <i className={`bi bi-chevron-${open ? "up" : "down"}`} style={{ fontSize: 11, color: "var(--muted-foreground)" }} />
        </button>

        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
            zIndex: 20, overflow: "hidden", maxHeight: 220, overflowY: "auto",
          }}>
            {loading ? (
              <div style={{ padding: 14, textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
                <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite", marginRight: 6 }} />
                Đang tải...
              </div>
            ) : qList.length === 0 ? (
              <div style={{ padding: 14, textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
                Chưa có báo giá nào
              </div>
            ) : qList.map((q, idx) => {
              const st = Q_STATUS_CFG[q.trangThai] ?? { label: q.trangThai, color: "#94a3b8", icon: "bi-circle", bg: "rgba(0,0,0,0.05)" };
              return (
                <div
                  key={q.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px",
                    borderBottom: idx < qList.length - 1 ? "1px solid var(--border)" : "none",
                  }}

                >
                  <div>
                    <p style={{ margin: "0 0 2px", fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: "var(--primary)" }}>
                      {q.code ?? "—"}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                      {q.ngayBaoGia ? new Date(q.ngayBaoGia).toLocaleDateString("vi-VN") : "—"}
                      &nbsp;·&nbsp;{(q.thanhTien ?? 0).toLocaleString("vi-VN")} ₫
                    </p>
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 700,
                    background: st.bg, color: st.color, whiteSpace: "nowrap",
                  }}>
                    <i className={`bi ${st.icon}`} style={{ fontSize: 9 }} />
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── ContractBadge ─────────────────────────────────────────────────────────────
const C_STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ ký", color: "#f59e0b" },
  active: { label: "Hiệu lực", color: "#10b981" },
  completed: { label: "Hoàn thành", color: "#3b82f6" },
  cancelled: { label: "Huỷ", color: "#ef4444" },
};

type ContractSummary = { id: string; code: string | null; trangThai: string; ngayKy: string | null; giaTriHopDong: number };

function ContractBadge({ customerId }: { customerId: string }) {
  const [open, setOpen] = React.useState(false);
  const [cList, setCList] = React.useState<ContractSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Fetch ngay khi mount / customerId thay đổi
  React.useEffect(() => {
    let cancelled = false;
    setCList([]);
    setLoading(true);
    fetch(`/api/plan-finance/contracts?customerId=${customerId}&page=1`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setCList(d.items ?? []); })
      .catch(() => { })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customerId]);

  const fmtMoney = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString("vi-VN");

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "7px 10px", borderRadius: 8, cursor: "pointer",
          background: "color-mix(in srgb, #10b981 6%, transparent)",
          border: "1px solid color-mix(in srgb, #10b981 20%, transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <i className="bi bi-file-earmark-check" style={{ fontSize: 13, color: "#10b981" }} />
          <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>Số hợp đồng:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>
            {loading
              ? <i className="bi bi-arrow-repeat" style={{ fontSize: 11, animation: "spin 0.8s linear infinite" }} />
              : cList.length
            }
          </span>
        </div>
        <i className={`bi bi-chevron-${open ? "up" : "down"}`} style={{ fontSize: 11, color: "var(--muted-foreground)" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
          zIndex: 20, overflow: "hidden", maxHeight: 220, overflowY: "auto",
        }}>
          {loading ? (
            <div style={{ padding: 14, textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
              <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite", marginRight: 6 }} />
              Đang tải...
            </div>
          ) : cList.length === 0 ? (
            <div style={{ padding: 14, textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
              Chưa có hợp đồng nào
            </div>
          ) : cList.map((c, idx) => {
            const st = C_STATUS_CFG[c.trangThai] ?? { label: c.trangThai, color: "#94a3b8" };
            return (
              <div key={c.id} style={{
                display: "flex", flexDirection: "column", gap: 3,
                padding: "8px 12px",
                borderBottom: idx < cList.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: "#10b981" }}>
                  {c.code ?? "—"}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Page ──────────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const [careplanOpen, setCareplanOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);
  const [quoteCustomer, setQuoteCustomer] = useState<CustomerRow | null>(null);
  const [nhomFilter, setNhomFilter] = useState("");
  const [nguonFilter, setNguonFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [kpiStats, setKpiStats] = useState<KpiStats | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [nguonOptions, setNguonOptions] = useState<CategoryOption[]>([]);
  const [nhomOptions, setNhomOptions] = useState<CategoryOption[]>([]);

  const year = new Date().getFullYear();

  const fetchStats = useCallback(() => {
    fetch("/api/plan-finance/stats", { cache: "no-store" })
      .then(r => r.json()).then(d => { if (d && !d.error) setKpiStats(d); }).catch(() => { });
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    // Fetch danh sách nhóm và nguồn khách hàng từ DB
    fetch("/api/plan-finance/categories?type=customer_source")
      .then(r => r.json()).then(d => Array.isArray(d) && setNguonOptions(d)).catch(() => {});
    fetch("/api/plan-finance/categories?type=customer_group")
      .then(r => r.json()).then(d => Array.isArray(d) && setNhomOptions(d)).catch(() => {});
  }, []);

  useEffect(() => {
    // Dùng endpoint chuyên biệt: query từ phía User (permissions contains "crm")
    // để không bỏ sót người dùng có quyền CRM nhưng Employee.userId chưa được gán
    fetch("/api/hr/employees/crm", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.employees)) setEmployees(d.employees.map((e: { id: string; fullName: string }) => ({ id: e.id, fullName: e.fullName })));
        if (d.currentUserEmployeeId) setCurrentUserEmployeeId(d.currentUserEmployeeId);
      })
      .catch(() => { });
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (nguonFilter) params.set("nguon", nguonFilter);
      if (nhomFilter) params.set("nhom", nhomFilter);
      const res = await fetch(`/api/plan-finance/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } finally { setLoading(false); }
  }, [page, search, nguonFilter, nhomFilter]);

  React.useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); }, 400);
  };

  return (
    <>
      <KeHoachChamSocOffcanvas
        open={careplanOpen}
        onClose={() => setCareplanOpen(false)}
        onSelectCustomer={(id) => {
          setCareplanOpen(false);
          const found = customers.find(c => c.id === id);
          if (found) {
            setSelectedCustomer(found);
          } else {
            // Nếu không có trong trang hiện tại, fetch chi tiết
            fetch(`/api/plan-finance/customers/${id}`)
              .then(r => r.ok ? r.json() : null)
              .then(data => { if (data) setSelectedCustomer(data); })
              .catch(() => { });
          }
        }}
      />
      <TaoKhachHangMoiModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => { setPage(1); fetchCustomers(); fetchStats(); }}
        employees={employees}
        defaultEmployeeId={currentUserEmployeeId}
      />
      <EditCustomerModal
        open={!!editCustomer}
        customer={editCustomer}
        onClose={() => setEditCustomer(null)}
        onSaved={(updated) => {
          setEditCustomer(null);
          fetchCustomers();
          fetchStats();
        }}
        employees={employees}
        nguonOptions={nguonOptions}
        nhomOptions={nhomOptions}
      />
      <ChiTietKhachHangOffcanvas
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onDeleted={() => { setPage(1); fetchCustomers(); fetchStats(); }}
        onEdit={() => {
          setEditCustomer(selectedCustomer);
          setSelectedCustomer(null);
        }}
        onQuote={() => setQuoteCustomer(selectedCustomer)}
        employees={employees}
        currentUserEmployeeId={currentUserEmployeeId}
      />
      {quoteCustomer && (
        <BaoGiaSanitaryModal
          open={true}
          onClose={() => setQuoteCustomer(null)}
          customer={quoteCustomer}
        />
      )}

      <SplitLayoutPage
        title="Khách hàng"
        description="Quản lý danh sách khách hàng và lịch sử giao dịch"
        icon="bi-people"
        color="cyan"
        leftTopContent={
          <div style={{ display: "flex", gap: 10 }}>
            <KpiCard icon="bi-people-fill" label="Tổng số" value={String(kpiStats?.totalCustomers ?? "—")} color="#6366f1" />
            <KpiCard icon="bi-person-plus" label={`Khách hàng ${year}`} value={String(kpiStats?.newCustomersThisYear ?? "—")} color="#06b6d4" />
          </div>
        }
        leftContent={
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <SectionTitle title="Cơ cấu theo nguồn" />
              <BarChartHorizontal color="#06b6d4"
                data={kpiStats?.customersByNguon ?? [
                  { label: "Tự nhiên", value: 0 },
                  { label: "Giới thiệu", value: 0 },
                  { label: "Quảng cáo", value: 0 },
                  { label: "Khác", value: 0 },
                ]}
              />
            </div>
            <div>
              <SectionTitle title="Cơ cấu theo nhóm" />
              <BarChartHorizontal color="#6366f1"
                data={kpiStats?.customersByNhom ?? [
                  { label: "Cá nhân", value: 0 },
                  { label: "Doanh nghiệp", value: 0 },
                  { label: "Đối tác", value: 0 },
                  { label: "Khách lẻ", value: 0 },
                ]}
              />
            </div>
          </div>
        }
        rightContent={
          <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
            <SectionTitle
              title="Danh sách khách hàng"
              action={
                <FilterSelect placeholder="Tất cả nguồn" value={nguonFilter} onChange={setNguonFilter}
                  options={nguonOptions.map(o => ({ label: o.name, value: o.code }))}
                />
              }
            />

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FilterSelect placeholder="Tất cả nhóm" value={nhomFilter} onChange={setNhomFilter}
                options={nhomOptions.map(o => ({ label: o.name, value: o.code }))}
              />
              <SearchInput value={search} onChange={setSearch} placeholder="Tìm khách hàng..." />

              <button onClick={() => setAddOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "6px 14px", background: "var(--primary)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                <i className="bi bi-plus-lg" style={{ fontSize: 14 }} /> Thêm mới
              </button>

              <button onClick={() => setCareplanOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "6px 14px", background: "transparent", color: "#6366f1", border: "1.5px solid #6366f1", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "color-mix(in srgb, #6366f1 10%, transparent)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <i className="bi bi-calendar-check" style={{ fontSize: 13 }} /> Kế hoạch chăm sóc
              </button>
            </div>

            {/* Bảng */}
            <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
              <Table
                rows={customers}
                loading={loading}
                rowKey={c => c.id}
                onRowClick={setSelectedCustomer}
                emptyIcon="bi-person-lines-fill"
                emptyText="Chưa có khách hàng nào"
                minWidth={520}
                columns={[
                  {
                    header: "Khách hàng",
                    render: c => (
                      <>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{c.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
                        {[c.nhom ? (nhomOptions.find(o => o.code === c.nhom)?.name ?? c.nhom) : "",
                          c.nguon ? (nguonOptions.find(o => o.code === c.nguon)?.name ?? c.nguon) : ""].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </>
                    ),
                  },
                  {
                    header: "Liên hệ",
                    render: c => (
                      <>
                        {c.dienThoai
                          ? <p style={{ margin: 0, fontSize: 13, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                            <i className="bi bi-telephone" style={{ fontSize: 11, marginRight: 4, color: "var(--muted-foreground)" }} />{c.dienThoai}
                          </p>
                          : <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>—</p>
                        }
                        {c.email && <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                          <i className="bi bi-envelope" style={{ fontSize: 10, marginRight: 3 }} />{c.email}
                        </p>}
                      </>
                    ),
                  },
                  {
                    header: "Người chăm sóc",
                    render: c => c.nguoiChamSoc
                      ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "color-mix(in srgb, #10b981 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#10b981" }}>
                          {c.nguoiChamSoc.fullName.split(" ").pop()?.[0] ?? "?"}
                        </div>
                        <span style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 500 }}>{c.nguoiChamSoc.fullName}</span>
                      </div>
                      : <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>Chưa phân công</span>,
                  },
                ]}
              />
            </div>

            <div style={{ marginTop: "auto" }}>
              <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); }} />
            </div>
          </div>
        }
      />
    </>
  );
}
