"use client";
import React, { useCallback, useEffect, useState } from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { FilterBadgeGroup } from "@/components/ui/FilterBadge";
import { TabBar } from "@/components/plan-finance/dung_chung/TabBar";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { Table, type TableColumn } from "@/components/ui/Table";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Debt {
  id: string;
  loai: string; // phai-thu | phai-tra
  doiTuong: string;
  soTien: number;
  daThu: number;
  hanThanhToan: string | null;
  trangThai: string; // chua-thu | mot-phan | da-thu | qua-han
  ghiChu: string | null;
  createdAt: string;
}
interface Stats {
  tongPhuThu: number; daThuDuoc: number;
  tongPhuTra: number; daTraDuoc: number;
  soKhoanQuaHan: number;
  coCapThu: { label: string; value: number }[];
  coCapTra: { label: string; value: number }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(1)
  : n >= 1e6 ? (n / 1e6).toFixed(1)
  : n.toLocaleString("vi-VN");

const fmtFull = (n: number) => Math.round(n).toLocaleString("vi-VN");

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

// ── Status helpers ────────────────────────────────────────────────────────────────────────
type DebtStatus = "chua-den-han" | "den-han" | "qua-han" | "da-xong";

const TABS = [
  { id: "phai-thu", label: "Phải thu", icon: "bi-arrow-down-circle-fill" },
  { id: "phai-tra", label: "Phải trả", icon: "bi-arrow-up-circle-fill" },
];

function computeStatus(debt: Debt): DebtStatus {
  if (debt.daThu >= debt.soTien) return "da-xong";
  if (!debt.hanThanhToan) return "chua-den-han";
  const a = Math.ceil((new Date(debt.hanThanhToan).getTime() - Date.now()) / 86400000);
  if (a >= 10) return "chua-den-han";
  if (a >= 0)  return "den-han";
  return "qua-han";
}

const STATUS_CFG: Record<DebtStatus, { label: string; color: string; bg: string }> = {
  "chua-den-han": { label: "Chưa đến hạn", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  "den-han":       { label: "Đến hạn",       color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  "qua-han":       { label: "Đã quá hạn",   color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  "da-xong":       { label: "Hoàn thành",   color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
};

const FILTER_OPTIONS = [
  { value: "",              label: "Tất cả" },
  { value: "chua-den-han",  label: "Chưa đến hạn",  activeColor: "#94a3b8" },
  { value: "den-han",       label: "Đến hạn",       activeColor: "#f59e0b" },
  { value: "qua-han",       label: "Đã quá hạn",   activeColor: "#ef4444" },
  { value: "da-xong",       label: "Hoàn thành",   activeColor: "#10b981" },
];

// ── Chi tiết công nợ Offcanvas ──────────────────────────────────────────────────
function ChiTietCongNoOffcanvas({ debt, onClose, onUpdated }: {
  debt: Debt | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const open = !!debt;
  const [payAmt, setPayAmt] = useState("");
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset khi mở mới
  useEffect(() => { if (open) { setPayAmt(""); setPaying(false); } }, [open]);

  if (!debt) return null;

  const status = computeStatus(debt);
  const cfg = STATUS_CFG[status];
  const conLai = debt.soTien - debt.daThu;
  const pct = debt.soTien > 0 ? Math.round(debt.daThu / debt.soTien * 100) : 100;
  const a = debt.hanThanhToan ? Math.ceil((new Date(debt.hanThanhToan).getTime() - Date.now()) / 86400000) : null;

  const handlePay = async () => {
    const amt = parseFloat(payAmt);
    if (isNaN(amt) || amt <= 0) return;
    setSaving(true);
    await fetch(`/api/plan-finance/debts/${debt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daThu: Math.min(debt.daThu + amt, debt.soTien) }),
    });
    setSaving(false); setPaying(false); setPayAmt(""); onUpdated();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/plan-finance/debts/${debt.id}`, { method: "DELETE" });
    setDeleting(false); setConfirmOpen(false); onClose(); onUpdated();
  };

  const IS: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "1.5px solid var(--border)", background: "var(--background)",
    color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1040, backdropFilter: "blur(2px)" }}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, width: "min(400px, 100vw)",
              background: "var(--card)", zIndex: 1050,
              borderLeft: "1px solid var(--border)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border)",
              background: `linear-gradient(135deg, ${cfg.bg}, transparent)`,
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color }}>
                      {debt.loai === "phai-thu" ? "Phải thu" : "Phải trả"}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {debt.doiTuong}
                  </h3>
                </div>
                <button onClick={onClose} style={{ background: "var(--muted)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "var(--muted-foreground)", fontSize: 16, flexShrink: 0, marginLeft: 12 }}>✕</button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {/* Số tiền + progress */}
              <div style={{ marginBottom: 24, padding: "16px", borderRadius: 12, background: "var(--muted)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Tổng nợ</p>
                    <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: debt.loai === "phai-thu" ? "#10b981" : "#ef4444" }}>
                      {fmtFull(debt.soTien)}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Còn lại</p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: conLai <= 0 ? "#10b981" : "var(--foreground)" }}>
                      {conLai <= 0 ? "✓ Xong" : fmtFull(conLai)}
                    </p>
                  </div>
                </div>
                {/* Progress */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Đã {debt.loai === "phai-thu" ? "thu" : "trả"}: {fmtFull(debt.daThu)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? "#10b981" : "var(--foreground)" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "#10b981" : debt.loai === "phai-thu" ? "#6366f1" : "#ef4444", borderRadius: 99, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              </div>

              {/* Thông tin */}
              <SectionTitle title="Thông tin" className="mb-3" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Loại", value: debt.loai === "phai-thu" ? "Phải thu" : "Phải trả", icon: "bi-arrow-left-right" },
                  { label: "Trạng thái", value: cfg.label, icon: "bi-circle-fill", color: cfg.color },
                  { label: "Hạn thanh toán", value: debt.hanThanhToan ? fmtDate(debt.hanThanhToan) : "Chưa đặt hạn", icon: "bi-calendar-event",
                    extra: a !== null ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: a < 0 ? "#ef4444" : a < 10 ? "#f59e0b" : "#10b981" }}>
                        {a < 0 ? `Quá ${Math.abs(a)} ngày` : a < 10 ? `Còn ${a} ngày` : `Còn ${a} ngày`}
                      </span>
                    ) : null,
                  },
                  ...(debt.ghiChu ? [{ label: "Ghi chú", value: debt.ghiChu, icon: "bi-chat-left-text" }] : []),
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <i className={`bi ${row.icon}`} style={{ color: row.color ?? "var(--muted-foreground)", fontSize: 14, marginTop: 2, width: 16, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{row.label}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{row.value}</p>
                        {row.extra}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ghi nhận thanh toán */}
              {status !== "da-xong" && (
                <>
                  <SectionTitle title="Ghi nhận thanh toán" className="mb-3" />
                  {!paying ? (
                    <button onClick={() => setPaying(true)} style={{
                      width: "100%", padding: "12px", borderRadius: 10, border: "2px dashed #6366f1",
                      background: "color-mix(in srgb,#6366f1 6%,transparent)",
                      color: "#6366f1", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <i className="bi bi-plus-lg" />
                      Ghi nhận {debt.loai === "phai-thu" ? "thu" : "trả"}
                    </button>
                  ) : (
                    <div style={{ background: "var(--muted)", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Số tiền</label>
                      <input type="number" placeholder="Nhập số tiền..." value={payAmt}
                        onChange={e => setPayAmt(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handlePay()}
                        autoFocus style={IS}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handlePay} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                          {saving ? "Đang lưu..." : "Lưu"}
                        </button>
                        <button onClick={() => { setPaying(false); setPayAmt(""); }} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer" }}>Huỷ</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmOpen(true)} disabled={deleting}
                style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <i className="bi bi-trash3 me-1" />{deleting ? "Đang xóa..." : "Xóa"}
              </button>
              <button onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Đóng</button>
            </div>
          </motion.div>

          <ConfirmDialog
            open={confirmOpen}
            title="Xóa khoản công nợ"
            message={<>Bạn có chắc muốn xóa khoản nợ của <strong>{debt.doiTuong}</strong>? Hành động này không thể hoàn tác.</>}
            confirmLabel="Xóa"
            variant="danger"
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => setConfirmOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  );
}

// ── Add Debt Modal ─────────────────────────────────────────────────────────────
function AddDebtModal({ loai, onClose, onSaved }: { loai: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    doiTuong: "", soTien: "", daThu: "0", hanThanhToan: "", ghiChu: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.doiTuong.trim()) { setErr("Vui lòng nhập tên đối tượng"); return; }
    if (!form.soTien || parseFloat(form.soTien) <= 0) { setErr("Vui lòng nhập số tiền hợp lệ"); return; }
    setSaving(true); setErr("");
    const res = await fetch("/api/plan-finance/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loai, doiTuong: form.doiTuong, soTien: parseFloat(form.soTien),
        daThu: parseFloat(form.daThu || "0"),
        hanThanhToan: form.hanThanhToan || null,
        ghiChu: form.ghiChu || null,
        trangThai: parseFloat(form.daThu || "0") >= parseFloat(form.soTien) ? "da-thu"
          : parseFloat(form.daThu || "0") > 0 ? "mot-phan" : "chua-thu",
      }),
    });
    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
    else { const d = await res.json(); setErr(d.error ?? "Lỗi không xác định"); }
  };

  const IS: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "1.5px solid var(--border)", background: "var(--background)",
    color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  const LA: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 5, display: "block" };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040, backdropFilter: "blur(3px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 1050, background: "var(--card)", borderRadius: 16,
        boxShadow: "0 24px 60px rgba(0,0,0,0.2)", padding: "24px", width: "min(420px, 96vw)",
        border: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--foreground)" }}>
              Thêm khoản {loai === "phai-thu" ? "phải thu" : "phải trả"}
            </h3>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
              Nhập thông tin khoản công nợ mới
            </p>
          </div>
          <button onClick={onClose} style={{ background: "var(--muted)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "var(--muted-foreground)", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={LA}>Đối tượng *</label>
            <input value={form.doiTuong} onChange={e => set("doiTuong", e.target.value)} placeholder={loai === "phai-thu" ? "Tên khách hàng, đơn vị..." : "Tên nhà cung cấp, đối tác..."} style={IS} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={LA}>Số tiền *</label>
              <input type="number" value={form.soTien} onChange={e => set("soTien", e.target.value)} placeholder="0" style={IS} />
            </div>
            <div>
              <label style={LA}>Đã {loai === "phai-thu" ? "thu" : "trả"}</label>
              <input type="number" value={form.daThu} onChange={e => set("daThu", e.target.value)} placeholder="0" style={IS} />
            </div>
          </div>
          <div>
            <label style={LA}>Hạn thanh toán</label>
            <input type="date" value={form.hanThanhToan} onChange={e => set("hanThanhToan", e.target.value)} style={IS} />
          </div>
          <div>
            <label style={LA}>Ghi chú</label>
            <textarea value={form.ghiChu} onChange={e => set("ghiChu", e.target.value)} placeholder="Ghi chú thêm..." rows={2} style={{ ...IS, resize: "none" }} />
          </div>
          {err && <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}><i className="bi bi-exclamation-circle me-1" />{err}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Huỷ</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: loai === "phai-thu" ? "#10b981" : "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Đang lưu..." : "Thêm khoản nợ"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Debt List (reusable) ───────────────────────────────────────────────────────
// ── Debt List ──────────────────────────────────────────────────────────────────────
function DebtList({ loai, refreshKey, onRefreshStats }: { loai: string; refreshKey: number; onRefreshStats: () => void }) {
  const [data, setData] = useState<{ items: Debt[]; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), search, loai });
    try {
      const res = await fetch(`/api/plan-finance/debts?${q}`);
      setData(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, search, loai, refreshKey]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter, loai]);
  const refresh = () => onRefreshStats(); // mọi thay đổi đều bubble lên page để refresh cả list lẫn stats

  const handlePay = async (debt: Debt) => {
    const amt = parseFloat(payAmt.replace(/[^0-9.]/g, ""));
    if (isNaN(amt) || amt <= 0) return;
    await fetch(`/api/plan-finance/debts/${debt.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daThu: Math.min(debt.daThu + amt, debt.soTien) }),
    });
    setPayingId(null); setPayAmt(""); refresh();
  };

  const allItems = data?.items ?? [];
  const filtered = statusFilter ? allItems.filter(d => computeStatus(d) === statusFilter) : allItems;
  const withCount = FILTER_OPTIONS.map(opt => ({
    ...opt,
    count: opt.value === "" ? allItems.length : allItems.filter(d => computeStatus(d) === opt.value).length,
  }));

  const columns: TableColumn<Debt>[] = [
    {
      header: "#", width: 28, align: "center",
      render: (_, i) => <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{i + 1}</span>,
    },
    {
      header: "Đối tượng",
      render: d => (
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{d.doiTuong}</p>
          {d.ghiChu && <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{d.ghiChu}</p>}
        </div>
      ),
    },
    {
      header: "Số tiền", width: 100, align: "right",
      render: d => (
        <span style={{ fontSize: 13, fontWeight: 700, color: loai === "phai-thu" ? "#10b981" : "#ef4444" }}>
          {fmt(d.soTien)}
        </span>
      ),
    },
    {
      header: "Còn lại", width: 100, align: "right",
      render: d => {
        const conLai = d.soTien - d.daThu;
        const pct = d.soTien > 0 ? Math.round(d.daThu / d.soTien * 100) : 100;
        return (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: conLai <= 0 ? "#10b981" : "var(--foreground)" }}>
              {conLai > 0 ? `${fmt(conLai)}` : "✓ Xong"}
            </span>
            <div style={{ height: 3, background: "var(--muted)", borderRadius: 99, marginTop: 4 }}>
              <div style={{ height: "100%", width: `${Math.min(pct,100)}%`, background: pct>=100?"#10b981":"#6366f1", borderRadius: 99 }} />
            </div>
          </div>
        );
      },
    },
    {
      header: "Hạn TT", width: 110,
      render: d => {
        if (!d.hanThanhToan) return <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>—</span>;
        const a = Math.ceil((new Date(d.hanThanhToan).getTime() - Date.now()) / 86400000);
        return (
          <div>
            <p style={{ margin: 0, fontSize: 12 }}>{fmtDate(d.hanThanhToan)}</p>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: a < 0 ? "#ef4444" : a < 10 ? "#f59e0b" : "var(--muted-foreground)" }}>
              {a < 0 ? `Quá ${Math.abs(a)} ngày` : `Còn ${a} ngày`}
            </p>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Tìm ${loai === "phai-thu" ? "khách hàng" : "nhà cung cấp"}...`} />
        <button onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: loai === "phai-thu" ? "#10b981" : "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          <i className="bi bi-plus-lg" /> Thêm mới
        </button>
      </div>
      <FilterBadgeGroup value={statusFilter} onChange={setStatusFilter} options={withCount} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Table rows={filtered} columns={columns} loading={loading} rowKey={d => d.id}
          emptyIcon={loai === "phai-thu" ? "bi-arrow-down-circle" : "bi-arrow-up-circle"}
          emptyText={`Chưa có khoản ${loai === "phai-thu" ? "phải thu" : "phải trả"} nào`}
          minWidth="100%"
          onRowClick={d => setSelectedDebt(d)}
        />
      </div>
      {(data?.totalPages ?? 1) > 1 && (
        <div style={{ flexShrink: 0 }}><Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} /></div>
      )}
      {showAdd && <AddDebtModal loai={loai} onClose={() => setShowAdd(false)} onSaved={refresh} />}
      <ChiTietCongNoOffcanvas
        debt={selectedDebt}
        onClose={() => setSelectedDebt(null)}
        onUpdated={() => { refresh(); setSelectedDebt(null); }}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DebtsPage() {
  const [activeTab, setActiveTab] = useState("phai-thu");
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch stats tổng hợp (không bị ảnh hưởng bởi tab/filter)
  useEffect(() => {
    fetch("/api/plan-finance/debts?page=1&search=")
      .then(r => r.json())
      .then(d => { if (d.stats) setStats(d.stats); })
      .catch(() => {});
  }, [refreshKey]);

  const tongThu = stats?.tongPhuThu ?? 0;
  const denHanThu = stats?.coCapThu?.find(c => c.label === "Đến hạn")?.value ?? 0;
  const tongTra = stats?.tongPhuTra ?? 0;
  const denHanTra = stats?.coCapTra?.find(c => c.label === "Đến hạn")?.value ?? 0;

  const leftContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <SectionTitle title="Cơ cấu nợ phải thu" className="mb-3" />
        <BarChartHorizontal
          data={stats?.coCapThu ?? []}
          color="#10b981"
          rowHeight={48}
        />
      </div>
      <div>
        <SectionTitle title="Cơ cấu nợ phải trả" className="mb-3" />
        <BarChartHorizontal
          data={stats?.coCapTra ?? []}
          color="#ef4444"
          rowHeight={48}
        />
      </div>
    </div>
  );

  const rightContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, marginBottom: 12 }}>
        <SectionTitle title="Danh sách công nợ" className="mb-0" />
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--muted)", cursor: "pointer", fontSize: 11,
            fontWeight: 600, color: "var(--muted-foreground)", transition: "0.15s",
          }}
        >
          <i className="bi bi-arrow-clockwise" /> Làm mới
        </button>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={TABS}
        activeTab={activeTab}
        onChange={t => setActiveTab(t)}
        activeColor={activeTab === "phai-thu" ? "#10b981" : "#ef4444"}
        style={{ marginBottom: 4, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minHeight: 0, marginTop: 12 }}>
        <DebtList key={activeTab} loai={activeTab} refreshKey={refreshKey} onRefreshStats={() => setRefreshKey(k => k + 1)} />
      </div>
    </div>
  );

  return (
    <SplitLayoutPage
      title="Quản lý công nợ"
      description="Theo dõi công nợ phải thu, phải trả và đối soát công nợ"
      icon="bi-wallet2"
      color="rose"
      leftTopContent={
        <div className="row g-3">
          <KPICard
            label="Tổng phải thu" value={`${fmt(tongThu)}`}
            icon="bi-arrow-down-circle-fill" accent="#10b981" colClass="col-6"
          />
          <KPICard
            label="Đến hạn" value={`${fmt(denHanThu)}`}
            icon="bi-alarm-fill" accent="#f59e0b" colClass="col-6"
          />
          <KPICard
            label="Tổng phải trả" value={`${fmt(tongTra)}`}
            icon="bi-arrow-up-circle-fill" accent="#ef4444" colClass="col-6"
          />
          <KPICard
            label="Đến hạn" value={`${fmt(denHanTra)}`}
            icon="bi-alarm-fill" accent="#f59e0b" colClass="col-6"
          />
        </div>
      }
      leftContent={leftContent}
      rightContent={rightContent}
    />
  );
}
