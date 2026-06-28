"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { FilterBadgeGroup } from "@/components/ui/FilterBadge";
import { Table, type TableColumn } from "@/components/ui/Table";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Expense {
  id: string;
  tenChiPhi: string;
  loai: string | null;
  soTien: number;
  ngayChiTra: string | null;
  nguoiChiTra: string | null;
  trangThai: string; // pending | approved | paid | rejected
  ghiChu: string | null;
  createdAt: string;
}

interface Category {
  id: string;
  code: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface StatsData {
  kpi: {
    tongTatCa: number;
    pending: number; approved: number; paid: number; rejected: number;
    countPending: number; countApproved: number; countPaid: number; countRejected: number;
  };
  tongChiPhiNam:  number;
  chiPhiThangNay: number;
  byLoai: { loai: string; label: string; soTien: number; count: number }[];
  byParentMonth: { parentId: string; name: string; color: string; dataByMonth: number[] }[];
  year: number;
  purchaseByMonth: number[];
  autoSync: { purchaseOrdersPaid: number; countPO: number };
}

// ── Constants ─────────────────────────────────────────────────────────────────
// ── Category types ─────────────────────────────────────────────────────────────
interface CategoryItem {
  id: string;
  code: string;
  name: string;
  color: string | null;
  icon:  string | null;
  parentId: string | null;
}

// Map: code → CategoryItem (dùng cho lookup nhanh)
type CategoryMap = Record<string, CategoryItem>;

/** Xây grouped options: cha + con, dùng cho <select> với <optgroup> */
function buildGroupedOptions(cats: CategoryItem[]) {
  const parents  = cats.filter(c => !c.parentId);
  const children = cats.filter(c =>  c.parentId);
  return parents.map(p => ({
    parent: p,
    children: children.filter(c => c.parentId === p.id),
  }));
}

/** Tìm label + màu theo code trong categoryMap */
function getCatMeta(code: string | null, map: CategoryMap) {
  if (!code) return { label: "—", color: "#94a3b8" };
  const cat = map[code];
  return { label: cat?.name ?? code, color: cat?.color ?? "#94a3b8" };
}

// ── Trạng thái không đổi ──────────────────────────────────────────────────────
const TRANG_THAI_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:  { label: "Chờ duyệt",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "bi-hourglass-split" },
  approved: { label: "Đã duyệt",      color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: "bi-check-circle" },
  paid:     { label: "Đã thanh toán", color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "bi-cash-stack" },
  rejected: { label: "Từ chối",       color: "#f43f5e", bg: "rgba(244,63,94,0.12)",  icon: "bi-x-circle" },
};

const FILTER_OPTIONS = [
  { value: "",         label: "Tất cả",        count: 0 },
  { value: "pending",  label: "Chờ duyệt",     count: 0, activeColor: "#f59e0b" },
  { value: "approved", label: "Đã duyệt",       count: 0, activeColor: "#6366f1" },
  { value: "paid",     label: "Đã thanh toán", count: 0, activeColor: "#10b981" },
  { value: "rejected", label: "Từ chối",       count: 0, activeColor: "#f43f5e" },
];

// ── Helper formats ─────────────────────────────────────────────────────────────
const fmtMoney = (n: number) => Math.round(n).toLocaleString("vi-VN");
const fmtFull  = (n: number) => Math.round(n).toLocaleString("vi-VN") + " ₫";
const fmtDate  = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// ── Hook: load expense categories từ DB ───────────────────────────────────────
function useExpenseCategories() {
  const [cats,    setCats]    = useState<CategoryItem[]>([]);
  const [catMap,  setCatMap]  = useState<CategoryMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plan-finance/categories?type=expense_type", { cache: "no-store" })
      .then(r => r.json())
      .then((data: CategoryItem[]) => {
        if (Array.isArray(data)) {
          setCats(data);
          setCatMap(Object.fromEntries(data.map(c => [c.code, c])));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { cats, catMap, loading };
}

// ── GroupedCategorySelect ─────────────────────────────────────────────────────
/** <select> có <optgroup> theo parent category, dùng chung cho filter và form */
function GroupedCategorySelect({
  cats, value, onChange, placeholder = "Tất cả", style, required,
}: {
  cats: CategoryItem[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  required?: boolean;
}) {
  const grouped = buildGroupedOptions(cats);
  const baseStyle: React.CSSProperties = {
    fontSize: 13, padding: "6px 28px 6px 10px",
    border: "1px solid var(--border)", background: "var(--card)",
    color: "var(--foreground)", cursor: "pointer", appearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 16 16'%3E%3Cpath fill='%23888' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
    ...style,
  };
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={baseStyle}>
      {!required && <option value="">{placeholder}</option>}
      {grouped.length > 0
        ? grouped.map(g => (
            <optgroup key={g.parent.id} label={g.parent.name}>
              {g.children.map(c => (
                <option key={c.id} value={c.code}>{c.name}</option>
              ))}
            </optgroup>
          ))
        : cats.filter(c => !c.parentId).map(c => (
            <option key={c.id} value={c.code}>{c.name}</option>
          ))
      }
    </select>
  );
}

// ── Form mặc định ──────────────────────────────────────────────────────────────
const emptyForm = () => ({
  tenChiPhi: "", loai: "", soTien: 0,
  ngayChiTra: "", nguoiChiTra: "", trangThai: "pending", ghiChu: "",
});

// ── Offcanvas Thêm / Sửa Chi phí ─────────────────────────────────────────────
function ChiPhiOffcanvas({
  item, onClose, onSaved, cats,
}: {
  item: Expense | null; // null = thêm mới
  onClose: () => void;
  onSaved: () => void;
  cats: CategoryItem[];
}) {
  const isEdit = !!item;
  const open = item !== undefined; // always open when rendered

  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setForm({
        tenChiPhi:   item.tenChiPhi,
        loai:        item.loai ?? "van-phong",
        soTien:      item.soTien,
        ngayChiTra:  item.ngayChiTra ? item.ngayChiTra.slice(0, 10) : "",
        nguoiChiTra: item.nguoiChiTra ?? "",
        trangThai:   item.trangThai,
        ghiChu:      item.ghiChu ?? "",
      });
    } else {
      setForm(emptyForm());
    }
    setErr("");
    setTimeout(() => firstInputRef.current?.focus(), 80);
  }, [item]);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.tenChiPhi.trim()) { setErr("Tên khoản chi không được để trống"); return; }
    if (form.soTien <= 0) { setErr("Số tiền phải lớn hơn 0"); return; }
    setSaving(true); setErr("");

    const payload = {
      tenChiPhi:   form.tenChiPhi.trim(),
      loai:        form.loai || null,
      soTien:      form.soTien,
      ngayChiTra:  form.ngayChiTra || null,
      nguoiChiTra: form.nguoiChiTra || null,
      trangThai:   form.trangThai,
      ghiChu:      form.ghiChu || null,
    };

    const res = isEdit
      ? await fetch(`/api/plan-finance/expenses/${item!.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/plan-finance/expenses", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
    else { const d = await res.json(); setErr(d.error ?? "Lỗi không xác định"); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/plan-finance/expenses/${item!.id}`, { method: "DELETE" });
    setDeleting(false); setConfirmDel(false); onSaved(); onClose();
  };

  // Approve / Paid quick actions
  const handleQuickStatus = async (trangThai: string) => {
    if (!item) return;
    setSaving(true);
    await fetch(`/api/plan-finance/expenses/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trangThai }),
    });
    setSaving(false); onSaved(); onClose();
  };

  const IS: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "1.5px solid var(--border)", background: "var(--background)",
    color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  const LA: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)",
    textTransform: "uppercase" as const, marginBottom: 5, display: "block",
    letterSpacing: "0.04em",
  };

  const tt = isEdit ? TRANG_THAI_CFG[item!.trangThai] : null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
          zIndex: 1040, backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(440px, 100vw)",
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
          background: isEdit
            ? `linear-gradient(135deg, ${tt?.bg ?? "transparent"}, transparent)`
            : "linear-gradient(135deg, color-mix(in srgb,#f59e0b 8%,transparent), transparent)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEdit && tt && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, fontWeight: 700, padding: "2px 10px",
                  borderRadius: 99, background: tt.bg, color: tt.color, marginBottom: 6,
                }}>
                  <i className={`bi ${tt.icon}`} style={{ fontSize: 10 }} />
                  {tt.label}
                </span>
              )}
              <h3 style={{
                margin: 0, fontSize: 17, fontWeight: 800, color: "var(--foreground)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {isEdit ? item!.tenChiPhi : "Thêm khoản chi phí"}
              </h3>
              {isEdit && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
                  {fmtFull(item!.soTien)} · {fmtDate(item!.ngayChiTra)}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "var(--muted)", border: "none", borderRadius: 8,
                width: 32, height: 32, cursor: "pointer",
                color: "var(--muted-foreground)", fontSize: 16, flexShrink: 0, marginLeft: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>

          {/* Quick action buttons (chỉ hiện khi edit) */}
          {isEdit && item!.trangThai === "pending" && (
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button
                onClick={() => handleQuickStatus("approved")}
                disabled={saving}
                style={{
                  flex: 1, padding: "6px", borderRadius: 8,
                  border: "none", background: "#6366f1", color: "#fff",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}
              >
                <i className="bi bi-check-circle" /> Duyệt
              </button>
              <button
                onClick={() => handleQuickStatus("paid")}
                disabled={saving}
                style={{
                  flex: 1, padding: "6px", borderRadius: 8,
                  border: "none", background: "#10b981", color: "#fff",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}
              >
                <i className="bi bi-cash-stack" /> Thanh toán
              </button>
              <button
                onClick={() => handleQuickStatus("rejected")}
                disabled={saving}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  border: "1px solid rgba(244,63,94,0.3)", background: "rgba(244,63,94,0.06)",
                  color: "#f43f5e", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}
              >
                <i className="bi bi-x-circle" /> Từ chối
              </button>
            </div>
          )}
          {isEdit && item!.trangThai === "approved" && (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => handleQuickStatus("paid")}
                disabled={saving}
                style={{
                  width: "100%", padding: "8px", borderRadius: 8,
                  border: "none", background: "#10b981", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <i className="bi bi-cash-stack" /> Đánh dấu đã thanh toán
              </button>
            </div>
          )}
        </div>

        {/* Body (form) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Tên khoản chi */}
            <div>
              <label style={LA}>Tên khoản chi *</label>
              <input
                ref={firstInputRef}
                value={form.tenChiPhi}
                onChange={e => set("tenChiPhi", e.target.value)}
                placeholder="VD: Tiền thuê văn phòng tháng 3..."
                style={IS}
                onKeyDown={e => e.key === "Enter" && handleSave()}
              />
            </div>

            {/* Loại + Số tiền */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={LA}>Loại chi phí</label>
                <GroupedCategorySelect
                  cats={cats}
                  value={form.loai}
                  onChange={v => set("loai", v)}
                  placeholder="-- Chọn loại --"
                  style={IS}
                />
              </div>
              <div>
                <label style={LA}>Số tiền (₫) *</label>
                <CurrencyInput
                  value={form.soTien}
                  onChange={v => set("soTien", v)}
                  placeholder="0"
                  style={IS}
                />
              </div>
            </div>

            {/* Ngày chi + Người chi */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={LA}>Ngày chi trả</label>
                <input
                  type="date"
                  value={form.ngayChiTra}
                  onChange={e => set("ngayChiTra", e.target.value)}
                  style={IS}
                />
              </div>
              <div>
                <label style={LA}>Người chi trả</label>
                <input
                  value={form.nguoiChiTra}
                  onChange={e => set("nguoiChiTra", e.target.value)}
                  placeholder="Tên người thực hiện..."
                  style={IS}
                />
              </div>
            </div>

            {/* Trạng thái */}
            <div>
              <label style={LA}>Trạng thái</label>
              <select
                value={form.trangThai}
                onChange={e => set("trangThai", e.target.value)}
                style={{ ...IS, appearance: "none", cursor: "pointer" }}
              >
                {Object.entries(TRANG_THAI_CFG).map(([v, cfg]) => (
                  <option key={v} value={v}>{cfg.label}</option>
                ))}
              </select>
            </div>

            {/* Ghi chú */}
            <div>
              <label style={LA}>Ghi chú</label>
              <textarea
                value={form.ghiChu}
                onChange={e => set("ghiChu", e.target.value)}
                placeholder="Ghi chú thêm về khoản chi..."
                rows={3}
                style={{ ...IS, resize: "none" }}
              />
            </div>

            {err && (
              <p style={{ margin: 0, fontSize: 12.5, color: "#f43f5e", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bi bi-exclamation-circle" /> {err}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid var(--border)",
          flexShrink: 0, display: "flex", gap: 8, alignItems: "center",
        }}>
          {isEdit && (
            <button
              onClick={() => setConfirmDel(true)}
              disabled={deleting}
              style={{
                padding: "9px 14px", borderRadius: 8,
                border: "1px solid rgba(244,63,94,0.3)",
                background: "rgba(244,63,94,0.06)",
                color: "#f43f5e", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              <i className="bi bi-trash3 me-1" />{deleting ? "Đang xóa..." : "Xóa"}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "9px", borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--muted)",
              color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >Huỷ</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: "9px", borderRadius: 8,
              border: "none", background: "#f59e0b", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {saving
              ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang lưu...</>
              : <><i className={`bi ${isEdit ? "bi-floppy" : "bi-plus-lg"}`} /> {isEdit ? "Lưu thay đổi" : "Thêm chi phí"}</>
            }
          </button>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmDel}
        title="Xóa khoản chi phí"
        message={<>Xóa <strong>{item?.tenChiPhi}</strong>? Hành động này không thể hoàn tác.</>}
        confirmLabel="Xóa"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </>
  );
}

// ── AutoSync Banner ────────────────────────────────────────────────────────────
function AutoSyncBanner({ autoSync }: { autoSync?: { purchaseOrdersPaid: number; countPO: number } }) {
  if (!autoSync || autoSync.countPO === 0) return null;
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 10,
      background: "color-mix(in srgb,#06b6d4 8%,transparent)",
      border: "1px solid color-mix(in srgb,#06b6d4 25%,transparent)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <i className="bi bi-arrow-repeat" style={{ color: "#06b6d4", fontSize: 16, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>
          Auto-sync từ mua hàng
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
          {autoSync.countPO} đơn mua đã thanh toán · Tổng {fmtFull(autoSync.purchaseOrdersPaid)}
        </p>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#06b6d4", flexShrink: 0 }}>
        Năm nay
      </span>
    </div>
  );
}

// ── Left Panel: Stats + Charts ─────────────────────────────────────────────────
function StatsPanel({ stats, year, onYearChange }: {
  stats: StatsData | null;
  year: number;
  onYearChange: (y: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  const PALETTE = ["#f59e0b", "#6366f1", "#f43f5e", "#10b981", "#06b6d4"];

  // Bar chart theo nhóm cha (Cố định / Biến đổi / Tài chính)
  const parentBarData = (stats?.byParentMonth ?? []).map(s => ({
    label: s.name,
    value: s.dataByMonth.reduce((sum, v) => sum + v, 0),
  }));
  const parentBarColors = (stats?.byParentMonth ?? []).map((_, i) => PALETTE[i % PALETTE.length]);

  // Bar chart theo loại con
  const barData = (stats?.byLoai ?? []).map(r => ({
    label: r.label,
    value: r.soTien,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Auto-sync banner */}
      <AutoSyncBanner autoSync={stats?.autoSync} />

      {/* Biểu đồ theo tháng */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <SectionTitle title="Chi phí theo tháng" />
          <select
            value={year}
            onChange={e => onYearChange(Number(e.target.value))}
            style={{
              fontSize: 12, padding: "4px 20px 4px 8px", borderRadius: 7,
              border: "1px solid var(--border)", background: "var(--card)",
              color: "var(--foreground)", cursor: "pointer", appearance: "none",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 16 16'%3E%3Cpath fill='%23888' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat", backgroundPosition: "right 5px center",
            }}
          >
            {Array.from({ length: 4 }, (_, i) => currentYear - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {/* Force 3 màu phân biệt theo index — không dùng màu DB */}
        {(() => {
          const PALETTE = ["#f59e0b", "#6366f1", "#f43f5e", "#10b981", "#06b6d4"];
          const activeSeries = (stats?.byParentMonth ?? []).map((s, i) => ({
            name:  s.name,
            data:  s.dataByMonth,
            color: PALETTE[i % PALETTE.length],   // luôn dùng palette cứng
          }));
          return (
            <YearAreaChart
              series={activeSeries}
              height={220}
              hideYAxis
            />
          );
        })()}
      </div>

      {/* Cơ cấu theo loại */}
      <div>
        <SectionTitle title="Cơ cấu chi phí theo loại" />

        {/* Bar nhóm cha: Cố định / Biến đổi / Tài chính */}
        {parentBarData.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "24px 0",
            color: "var(--muted-foreground)", fontSize: 13,
          }}>
            <i className="bi bi-bar-chart" style={{ fontSize: 28, display: "block", marginBottom: 6, opacity: 0.25 }} />
            Chưa có dữ liệu
          </div>
        ) : (
          <BarChartHorizontal
            data={parentBarData}
            colors={parentBarColors}
          />
        )}
      </div>
    </div>
  );
}

// ── Expense Table (Right) ──────────────────────────────────────────────────────
function ExpenseTable({
  refreshKey,
  onRefresh,
}: {
  refreshKey: number;
  onRefresh: () => void;
}) {
  const { cats, catMap } = useExpenseCategories();
  const [data, setData] = useState<{
    items: Expense[]; total: number; totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [trangThaiFilter, setTrangThaiFilter] = useState("");
  const [loaiFilter, setLoaiFilter] = useState("");
  const _today = new Date();
  const _defaultFrom = `${_today.getFullYear()}-01-01`;
  const _defaultTo   = _today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(_defaultFrom);
  const [dateTo,   setDateTo]   = useState(_defaultTo);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Expense | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({
      page: String(page), search,
      trangThai: trangThaiFilter, loai: loaiFilter,
      dateFrom, dateTo,
    });
    try {
      const res = await fetch(`/api/plan-finance/expenses?${q}`, { cache: "no-store" });
      setData(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, search, trangThaiFilter, loaiFilter, dateFrom, dateTo, refreshKey]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, trangThaiFilter, loaiFilter, dateFrom, dateTo]);

  const handleRowClick = (row: Expense) => {
    setSelectedItem(row);
    setShowOffcanvas(true);
  };

  const handleCloseOffcanvas = () => {
    setShowOffcanvas(false);
    setSelectedItem(null);
    setShowAdd(false);
  };

  const handleSaved = () => {
    onRefresh();
  };

  // Build filter badge options với counts từ items hiện tại
  const allItems = data?.items ?? [];
  const filterOptions = FILTER_OPTIONS.map(opt => ({
    ...opt,
    count: opt.value === ""
      ? data?.total ?? 0
      : allItems.filter(i => i.trangThai === opt.value).length,
  }));

  const columns: TableColumn<Expense>[] = [
    {
      header: "#", width: 28, align: "center",
      render: (_, i) => (
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
          {(page - 1) * 15 + i + 1}
        </span>
      ),
    },
    {
      header: "Khoản chi",
      render: row => (
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.tenChiPhi}</p>
          {row.nguoiChiTra && (
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
              <i className="bi bi-person me-1" style={{ opacity: 0.6 }} />
              {row.nguoiChiTra}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Loại", width: 108,
      render: row => {
        const { label, color } = getCatMeta(row.loai, catMap);
        return (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 8px",
            borderRadius: 99, display: "inline-block",
            background: `${color}18`, color,
            whiteSpace: "nowrap", maxWidth: 104,
            overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {label}
          </span>
        );
      },
    },
    {
      header: "Số tiền", width: 86, align: "right",
      render: row => (
        <span style={{ fontSize: 13, fontWeight: 800, color: "#f43f5e", whiteSpace: "nowrap" }}>
          {fmtMoney(row.soTien)}
        </span>
      ),
    },
    {
      header: "Ngày chi", width: 86,
      render: row => (
        <span style={{ fontSize: 12, whiteSpace: "nowrap", color: row.ngayChiTra ? "var(--foreground)" : "var(--muted-foreground)" }}>
          {fmtDate(row.ngayChiTra)}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
      {/* Header row: title + refresh only */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 8 }}>
        <SectionTitle title="Danh sách các khoản chi phí" />
        <button
          onClick={onRefresh}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 10px", borderRadius: 8,
            border: "1px solid var(--border)", background: "var(--muted)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            color: "var(--muted-foreground)", flexShrink: 0,
          }}
          title="Làm mới"
        >
          <i className="bi bi-arrow-clockwise" />
        </button>
      </div>

      {/* Toolbar: [Loại] [Search] [+ Thêm mới] */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
        <GroupedCategorySelect
          cats={cats}
          value={loaiFilter}
          onChange={setLoaiFilter}
          placeholder="Loại chi phí"
          style={{ width: 160, borderRadius: 8 }}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm khoản chi..."
        />

        <button
          onClick={() => { setShowAdd(true); setShowOffcanvas(true); setSelectedItem(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 14px", borderRadius: 8, border: "none",
            background: "#f59e0b", color: "#fff",
            fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,
          }}
        >
          <i className="bi bi-plus-lg" /> Thêm mới
        </button>
      </div>

      {/* Filter badges */}
      <FilterBadgeGroup
        value={trangThaiFilter}
        onChange={setTrangThaiFilter}
        options={filterOptions}
        activeColor="#f59e0b"
        style={{ flexShrink: 0 }}
      />

      {/* Summary label + date range */}
      {!loading && data && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {data.total > 0
              ? `${data.total} khoản · Tổng: ${fmtFull(allItems.reduce((s, i) => s + i.soTien, 0))}`
              : "Không có kết quả"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              title="Từ ngày"
              style={{
                fontSize: 11, padding: "4px 6px", borderRadius: 7,
                border: "1px solid var(--border)", background: "var(--background)",
                color: "var(--foreground)", outline: "none", width: 118,
              }}
            />
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              title="Đến ngày"
              style={{
                fontSize: 11, padding: "4px 6px", borderRadius: 7,
                border: "1px solid var(--border)", background: "var(--background)",
                color: "var(--foreground)", outline: "none", width: 118,
              }}
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                title="Xoá bộ lọc ngày"
                style={{
                  fontSize: 13, color: "#f43f5e", border: "none",
                  background: "none", cursor: "pointer", padding: "2px 4px",
                  display: "flex", alignItems: "center",
                }}
              >
                <i className="bi bi-x-circle" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Table
          rows={data?.items ?? []}
          columns={columns}
          loading={loading}
          rowKey={r => r.id}
          onRowClick={handleRowClick}
          emptyIcon="bi-cash-coin"
          emptyText="Chưa có khoản chi phí nào"
          minWidth={420}
          compact
        />
      </div>

      {/* Pagination */}
      {(data?.totalPages ?? 1) > 1 && (
        <div style={{ flexShrink: 0 }}>
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 1}
            onChange={setPage}
          />
        </div>
      )}

      {/* Offcanvas */}
      <AnimatePresence>
        {showOffcanvas && (
          <ChiPhiOffcanvas
            item={showAdd ? null : selectedItem}
            onClose={handleCloseOffcanvas}
            onSaved={handleSaved}
            cats={cats}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const currentYear = new Date().getFullYear();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [year, setYear] = useState(currentYear);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadStats = useCallback(async (y: number) => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/plan-finance/expenses/stats?year=${y}`, { cache: "no-store" });
      const d = await res.json();
      if (!d.error) setStats(d);
    } catch { /* ignore */ } finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { loadStats(year); }, [loadStats, year, refreshKey]);

  const handleRefresh = () => setRefreshKey(k => k + 1);

  const kpi = stats?.kpi;
  const fmt = (n: number) => statsLoading ? "—" : fmtMoney(n);

  return (
    <SplitLayoutPage
      title="Quản lý chi phí"
      description="Theo dõi và kiểm soát chi phí vận hành, phân bổ ngân sách"
      icon="bi-cash-coin"
      color="amber"
      leftCols={5}
      leftTopContent={
        <div className="row g-2">
          <KPICard
            label={`Tổng chi phí năm ${year}`}
            value={fmt(stats?.tongChiPhiNam ?? 0)}
            icon="bi-cash-coin"
            accent="#f59e0b"
            colClass="col-6"
          />
          <KPICard
            label="Chi phí tháng này"
            value={fmt(stats?.chiPhiThangNay ?? 0)}
            icon="bi-calendar-month"
            accent="#6366f1"
            colClass="col-6"
          />
        </div>
      }
      leftContent={
        <StatsPanel
          stats={stats}
          year={year}
          onYearChange={setYear}
        />
      }
      rightContent={
        <ExpenseTable
          refreshKey={refreshKey}
          onRefresh={handleRefresh}
        />
      }
    />
  );
}
