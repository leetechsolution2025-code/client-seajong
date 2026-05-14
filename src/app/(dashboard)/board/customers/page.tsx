"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { TabBar, TabItem } from "@/components/plan-finance/dung_chung/TabBar";
import { useToast } from "@/components/ui/Toast";
import { FilterBadgeGroup } from "@/components/ui/FilterBadge";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Customer {
  id: string; name: string; nguon?: string | null; nhom?: string | null;
  daiDien?: string | null; xungHo?: string | null; dienThoai?: string | null;
  email?: string | null;
  nguoiChamSoc?: { fullName: string } | null;
  createdAt: string;
  _count: { saleOrders: number; careHistories: number; quotations: number; contracts: number };
}
interface Quotation {
  id: string; code?: string | null; trangThai: string; uuTien: string;
  thanhTien: number; tongTien: number;
  ngayBaoGia?: string | null; ngayHetHan?: string | null;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
  nguoiPhuTrach?: { fullName: string } | null;
  createdAt: string;
}
interface Contract {
  id: string; code?: string | null; trangThai: string; uuTien: string;
  giaTriHopDong: number; daThanhToan: number; ghiChu?: string | null;
  ngayKy?: string | null; ngayBatDau?: string | null; ngayKetThuc?: string | null;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
  nguoiPhuTrach?: { fullName: string; workEmail?: string | null } | null;
  createdAt: string;
}
interface CareHistory {
  id: string; ngayChamSoc: string; hinhThuc: string; thaiDo?: string | null;
  nhuCau?: string | null; tomTat: string;
  customerId: string;
  customer?: { id: string; name: string } | null;
  nguoiChamSoc?: { fullName: string } | null;
}
interface RetailInvoice {
  id: string; code?: string | null; tenKhach?: string | null; dienThoai?: string | null;
  tongTien: number; chietKhau: number; vat: number; tongCong: number; conNo: number;
  hinhThucTT: string; trangThai: string;
  nguoiBan?: { fullName: string } | null;
  items: { tenHang: string; soLuong: number; donGia: number; thanhTien: number }[];
  createdAt: string;
}
interface Stats {
  totalCustomers: number; totalQuotations: number; totalContracts: number;
  activeContractsCount: number; overdueContractsCount: number; doneContractsCount: number;
  contractRevenue: number;
  quotationSentCount: number; quotationWonCount: number; quotationLostCount: number;
  nguonMap: Record<string, number>;
  retail: {
    revenue: number; count: number;
    topItems: { name: string; qty: number; revenue: number }[];
    payMap: Record<string, number>;
  };
}
interface BoardData {
  customers: Customer[]; quotations: Quotation[]; contracts: Contract[];
  careHistories: CareHistory[]; retailInvoices: RetailInvoice[]; stats: Stats;
  alerts: { overdueContracts: Contract[]; expiringQuotations: Quotation[] };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " tỷ";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " tr";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "k";
  return n.toString();
}
function fmtNum(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

const NGUON_LABEL: Record<string, string> = {
  "tu-nhien": "Tự nhiên", "gioi-thieu": "Giới thiệu",
  "quang-cao": "Quảng cáo", "khac": "Khác",
};
const NHOM_LABEL: Record<string, string> = {
  "ca-nhan": "Cá nhân", "doanh-nghiep": "Doanh nghiệp",
  "doi-tac": "Đối tác", "khach-le": "Khách lẻ",
};

// ── Status configs ─────────────────────────────────────────────────────────────
const Q_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: "Nháp",        color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  sent:     { label: "Đã gửi",      color: "#3b82f6", bg: "rgba(59,130,246,0.10)" },
  approved: { label: "Đã duyệt",    color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
  won:      { label: "Thắng",       color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  lost:     { label: "Thua",        color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
};
const C_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Chưa thực hiện", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  active:    { label: "Đang thực hiện", color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  delayed:   { label: "Chậm tiến độ",  color: "#f97316", bg: "rgba(249,115,22,0.10)" },
  overdue:   { label: "Quá hạn",       color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
  done:      { label: "Hoàn thành",    color: "#6366f1", bg: "rgba(99,102,241,0.10)" },
  cancelled: { label: "Đã huỷ",        color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};
const RETAIL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "da-xuat-hang":   { label: "Đã xuất hàng",  color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  "chua-xuat-hang": { label: "Chưa xuất hàng", color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  "con-cong-no":    { label: "Còn công nợ",    color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
};
const CARE_ICON: Record<string, string> = {
  "goi-dien": "bi-telephone-fill", "gap-mat": "bi-people-fill",
  "email": "bi-envelope-fill", "khac": "bi-chat-dots-fill",
};
const THAI_DO_COLOR: Record<string, string> = {
  "tich-cuc": "#10b981", "trung-lap": "#94a3b8",
  "tieu-cuc": "#ef4444", "do-du": "#f59e0b",
};

// ── Avatar ─────────────────────────────────────────────────────────────────────
const GRAD = [
  ["#6366f1","#4f46e5"], ["#10b981","#059669"], ["#f59e0b","#d97706"],
  ["#ec4899","#db2777"], ["#3b82f6","#2563eb"], ["#8b5cf6","#7c3aed"],
];
function avatarColor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRAD[Math.abs(h) % GRAD.length] as [string, string];
}
function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const [c1, c2] = avatarColor(name);
  const initials = name.trim().split(" ").filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg,${c1},${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: size * 0.35,
    }}>{initials}</div>
  );
}

// ── StatusBadge ────────────────────────────────────────────────────────────────
function StatusBadge({ color, bg, label }: { color: string; bg: string; label: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg, color }}>
      {label}
    </span>
  );
}

// ── AlertSummaryRow ────────────────────────────────────────────────────────────
function AlertSummaryRow({ icon, label, count, color, bg, border, emptyText, onClick }: {
  icon: string; label: string; count: number;
  color: string; bg: string; border: string;
  emptyText: string; onClick: () => void;
}) {
  const has = count > 0;
  return (
    <div onClick={has ? onClick : undefined} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", borderRadius: 10,
      border: `1px solid ${has ? border : "var(--border)"}`,
      background: has ? bg : "var(--card)",
      cursor: has ? "pointer" : "default", transition: "all 0.15s",
    }}
      onMouseEnter={e => { if (has) (e.currentTarget as HTMLDivElement).style.filter = "brightness(0.97)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.filter = ""; }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: has ? `${color}22` : "var(--muted)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className={`bi ${icon}`} style={{ color: has ? color : "var(--muted-foreground)", fontSize: 14 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: has ? color : "var(--muted-foreground)" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)", marginTop: 1 }}>
          {has ? `${count} mục cần xử lý` : emptyText}
        </p>
      </div>
      {has ? (
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{ background: color, color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 900, padding: "1px 8px" }}>{count}</span>
          <i className="bi bi-chevron-right" style={{ color, fontSize: 11 }} />
        </div>
      ) : (
        <i className="bi bi-check-circle-fill" style={{ color: "#10b981", fontSize: 14, flexShrink: 0 }} />
      )}
    </div>
  );
}

// ── Detail Drawer ──────────────────────────────────────────────────────────────
type DrawerType = "overdueContracts" | "expiringQuotations";
function DetailDrawer({ type, contracts, quotations, onClose }: {
  type: DrawerType;
  contracts: Contract[];
  quotations: Quotation[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const isContract = type === "overdueContracts";
  const color = isContract ? "#ef4444" : "#f59e0b";
  const bg    = isContract ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)";
  const icon  = isContract ? "bi-x-circle-fill" : "bi-clock-history";
  const title = isContract ? "Hợp đồng quá hạn" : "Báo giá sắp hết hạn";
  const items = isContract ? contracts : quotations;

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 10011,
        width: "min(400px,100vw)", background: "var(--card)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 62, flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className={`bi ${icon}`} style={{ color, fontSize: 16 }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>{title}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{items.length} mục</p>
          </div>
          <button onClick={onClose} style={{ background: "var(--muted)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
            <i className="bi bi-x" />
          </button>
        </div>
        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {isContract ? (contracts as Contract[]).map(c => {
            const cfg = C_STATUS[c.trangThai] ?? C_STATUS.overdue;
            const pct = c.giaTriHopDong > 0 ? Math.round(c.daThanhToan / c.giaTriHopDong * 100) : 0;
            return (
              <div key={c.id} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${cfg.color}30`, background: cfg.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.customer?.name ?? "—"}</p>
                    <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)" }}>{c.code ?? "Chưa có mã"} · {c.nguoiPhuTrach?.fullName ?? "Chưa phân công"}</p>
                  </div>
                  <StatusBadge {...cfg} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted-foreground)" }}>
                  <span>Giá trị: <strong style={{ color: "#6366f1" }}>{fmt(c.giaTriHopDong)}đ</strong></span>
                  <span>Hạn: {fmtDate(c.ngayKetThuc)}</span>
                </div>
                {/* Progress bar */}
                <div style={{ marginTop: 6, height: 4, background: "var(--muted)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: cfg.color, borderRadius: 99, transition: "width 0.3s" }} />
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 9.5, color: "var(--muted-foreground)" }}>Thanh toán {pct}%</p>
              </div>
            );
          }) : (quotations as Quotation[]).map(q => {
            const cfg = Q_STATUS[q.trangThai] ?? Q_STATUS.sent;
            const days = q.ngayHetHan ? daysUntil(q.ngayHetHan) : null;
            return (
              <div key={q.id} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${cfg.color}30`, background: cfg.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.customer?.name ?? "—"}</p>
                    <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)" }}>{q.code ?? "Chưa có mã"} · {q.nguoiPhuTrach?.fullName ?? "—"}</p>
                  </div>
                  <StatusBadge {...cfg} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted-foreground)" }}>
                  <span>Giá trị: <strong style={{ color: "#6366f1" }}>{fmt(q.thanhTien)}đ</strong></span>
                  {days !== null && (
                    <span style={{ color: days <= 3 ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>Còn {days} ngày</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Funnel Bar ─────────────────────────────────────────────────────────────────
function FunnelBar({ label, count, max, color, pct }: {
  label: string; count: number; max: number; color: string; pct?: string;
}) {
  const w = max > 0 ? Math.round(count / max * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {pct && <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{pct} conversion</span>}
          <span style={{ fontSize: 13, fontWeight: 800, color }}>{count}</span>
        </div>
      </div>
      <div style={{ height: 8, background: "var(--muted)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 99, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ── Year Switch (tái sử dụng) ───────────────────────────────────────────────
function YearSwitch({ year, checked, onChange }: { year: number; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0, userSelect: "none" }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>Năm {year}</span>
      <div onClick={onChange} style={{
        width: 28, height: 16, borderRadius: 99, flexShrink: 0,
        background: checked ? "#6366f1" : "var(--muted)",
        position: "relative", transition: "background 0.2s", cursor: "pointer",
      }}>
        <div style={{
          position: "absolute", top: 2, left: checked ? 14 : 2,
          width: 12, height: 12, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </div>
    </label>
  );
}

// ── Stat Bar (hiển thị tóm tắt theo dạng inline) ──────────────────────────────
function StatBar({ items }: {
  items: { label: string; value: string | number; pct?: number; color?: string }[];
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      padding: "7px 10px", borderRadius: 8, marginBottom: 10,
      background: "var(--muted)", border: "1px solid var(--border)",
    }}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div style={{ width: 1, height: 26, background: "var(--border)", flexShrink: 0, margin: "0 10px" }} />}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{item.label}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: item.color ?? "var(--foreground)", whiteSpace: "nowrap" }}>{item.value}</span>
              {item.pct !== undefined && (
                <span style={{ fontSize: 9.5, fontWeight: 600, color: item.pct > 30 ? "#ef4444" : "#10b981" }}>
                  {item.pct}%
                </span>
              )}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ── AI Detail Offcanvas ────────────────────────────────────────────────────────
type AiResult = {
  tongQuan: string; diemNhanhCount: number;
  diemTot: string[]; canhBao: string[];
  xuHuong: string | null; khuyenNghi: string[];
};
function AiDetailOffcanvas({ result, onClose, healthColor, healthLabel }: {
  result: AiResult;
  onClose: () => void;
  healthColor: (n: number) => string;
  healthLabel: (n: number) => string;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1040, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
        background: "var(--card)", borderLeft: "1px solid var(--border)",
        zIndex: 1050, display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
        animation: "slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <i className="bi bi-stars" style={{ color: "#8b5cf6", fontSize: 16 }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>Phân tích kinh doanh chi tiết</h3>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Phân tích tự động bởi Trí tuệ nhân tạo AI — chỉ mang tính tham khảo</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Health + Tổng quan */}
          <div style={{ display: "flex", gap: 14, padding: "12px 14px", borderRadius: 10, background: `${healthColor(result.diemNhanhCount)}10`, border: `1px solid ${healthColor(result.diemNhanhCount)}30` }}>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 900, lineHeight: 1, color: healthColor(result.diemNhanhCount) }}>{result.diemNhanhCount}</p>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: healthColor(result.diemNhanhCount), textTransform: "uppercase" }}>/100</p>
              <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 700, color: healthColor(result.diemNhanhCount) }}>{healthLabel(result.diemNhanhCount)}</p>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.6, alignSelf: "center" }}>{result.tongQuan}</p>
          </div>

          {/* Xu hướng */}
          {result.xuHuong && (
            <section>
              <p style={{ margin: "0 0 8px", fontSize: 10.5, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em" }}>Xu hướng theo lịch sử</p>
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.6 }}>
                {result.xuHuong}
              </div>
            </section>
          )}

          {/* Điểm tích cực */}
          {result.diemTot.length > 0 && (
            <section>
              <p style={{ margin: "0 0 8px", fontSize: 10.5, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.07em" }}>Điểm tích cực</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {result.diemTot.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, padding: "8px 10px", borderRadius: 8, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <i className="bi bi-check-circle-fill" style={{ color: "#10b981", fontSize: 13, marginTop: 1, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.5 }}>{d}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cảnh báo */}
          {result.canhBao.length > 0 && (
            <section>
              <p style={{ margin: "0 0 8px", fontSize: 10.5, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.07em" }}>Cảnh báo</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {result.canhBao.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, padding: "8px 10px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ color: "#f59e0b", fontSize: 13, marginTop: 1, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.5 }}>{d}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Khuyến nghị Ban Giám đốc */}
          {result.khuyenNghi.length > 0 && (
            <section>
              <p style={{ margin: "0 0 8px", fontSize: 10.5, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em" }}>Khuyến nghị Ban Giám đốc</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {result.khuyenNghi.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, padding: "8px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: "#6366f1", flexShrink: 0, minWidth: 18 }}>{i + 1}.</span>
                    <p style={{ margin: 0, fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.5 }}>{d}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

// ── Contract Offcanvas ─────────────────────────────────────────────────────────
function ContractOffcanvas({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const cfg = C_STATUS[contract.trangThai] ?? C_STATUS.pending;
  const pct = contract.giaTriHopDong > 0
    ? Math.round(contract.daThanhToan / contract.giaTriHopDong * 100) : 0;
  const congNo = contract.giaTriHopDong - contract.daThanhToan;
  const UU_TIEN: Record<string, { label: string; color: string }> = {
    high:   { label: "Cao",    color: "#ef4444" },
    medium: { label: "Trung bình", color: "#f59e0b" },
    low:    { label: "Thấp",   color: "#94a3b8" },
  };
  const uuTienCfg = UU_TIEN[contract.uuTien] ?? UU_TIEN.medium;

  // Tiến độ thưực hiện
  const progressBadge = (() => {
    if (contract.trangThai === "done") return { label: "Hoàn thành", color: "#6366f1" };
    if (contract.trangThai === "cancelled") return { label: "Đã huỷ", color: "#94a3b8" };
    if (contract.trangThai === "overdue") return { label: "Quá hạn", color: "#ef4444" };
    if (contract.trangThai === "delayed") return { label: "Chậm tiến độ", color: "#f59e0b" };
    if (contract.ngayKetThuc) {
      const d = daysUntil(contract.ngayKetThuc);
      if (d < 0)   return { label: "Quá hạn", color: "#ef4444" };
      if (d <= 30) return { label: "Chậm tiến độ", color: "#f59e0b" };
    }
    if (contract.trangThai === "pending") return { label: "Chưa thực hiện", color: "#94a3b8" };
    return { label: "Đúng tiến độ", color: "#10b981" };
  })();

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1040,
        backdropFilter: "blur(2px)",
      }} />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
        background: "var(--card)", borderLeft: "1px solid var(--border)",
        zIndex: 1050, display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
        animation: "slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>
                {contract.code ?? "Hợp đồng"}
              </h3>
              <StatusBadge {...cfg} />
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, color: progressBadge.color, background: `${progressBadge.color}18` }}>
                {progressBadge.label}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
              {contract.customer?.name ?? "—"}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
            background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Thông tin chính */}
          <section>
            <p style={{ margin: "0 0 10px", fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Thông tin hợp đồng</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Khách hàng",       value: contract.customer?.name ?? "—" },
                { label: "Người phụ trách", value: contract.nguoiPhuTrach?.fullName ?? "Chưa phân công" },
                { label: "Ngày ký",          value: fmtDate(contract.ngayKy) },
                { label: "Ngày bắt đầu",     value: fmtDate(contract.ngayBatDau) },
                { label: "Ngày kết thúc",   value: fmtDate(contract.ngayKetThuc), highlight: contract.ngayKetThuc ? daysUntil(contract.ngayKetThuc) <= 0 : false },
                { label: "Ư u tiên",          value: uuTienCfg.label, color: uuTienCfg.color },
              ].map(item => (
                <div key={item.label} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)" }}>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 12.5, fontWeight: 700, color: (item as { color?: string }).color ?? ((item as { highlight?: boolean }).highlight ? "#ef4444" : "var(--foreground)") }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Giá trị hợp đồng */}
          <section>
            <p style={{ margin: "0 0 10px", fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Thanh toán</p>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--muted)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase" }}>Giá trị hợp đồng</p>
                  <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: "var(--foreground)" }}>{fmtNum(contract.giaTriHopDong)} đ</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase" }}>Tỷ lệ thanh toán</p>
                  <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: pct >= 100 ? "#10b981" : "#6366f1" }}>{pct}%</p>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#10b981" : cfg.color, borderRadius: 99, transition: "width 0.6s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 9.5, color: "#10b981", fontWeight: 600 }}>ĐÃ THU</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 800, color: "#10b981" }}>{fmtNum(contract.daThanhToan)} đ</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 9.5, color: congNo > 0 ? "#ef4444" : "#94a3b8", fontWeight: 600 }}>CÒN LẠI</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 800, color: congNo > 0 ? "#ef4444" : "#94a3b8" }}>{fmtNum(congNo)} đ</p>
                </div>
              </div>
            </div>
          </section>

          {/* Thông tin thực hiện */}
          <section>
            <p style={{ margin: "0 0 10px", fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Quá trình thực hiện</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Timeline */}
              {[
                { label: "Ký hợp đồng",    date: contract.ngayKy,         done: !!contract.ngayKy,        color: "#6366f1" },
                { label: "Bắt đầu thực hiện", date: contract.ngayBatDau,   done: !!contract.ngayBatDau,    color: "#3b82f6" },
                { label: "Kết thúc / Nghiệm thu", date: contract.ngayKetThuc, done: contract.trangThai === "done", color: "#10b981" },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flexShrink: 0 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", border: `2px solid ${step.done ? step.color : "var(--border)"}`,
                      background: step.done ? step.color : "var(--muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <i className={step.done ? "bi bi-check" : "bi bi-circle"} style={{ fontSize: 11, color: step.done ? "#fff" : "var(--muted-foreground)" }} />
                    </div>
                    {i < 2 && <div style={{ width: 2, height: 24, background: "var(--border)" }} />}
                  </div>
                  <div style={{ paddingTop: 3 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: step.done ? "var(--foreground)" : "var(--muted-foreground)" }}>{step.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{step.date ? fmtDate(step.date) : "Chưa có"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Ghi chú */}
          {contract.ghiChu && (
            <section>
              <p style={{ margin: "0 0 8px", fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Ghi chú</p>
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)", fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.6 }}>
                {contract.ghiChu}
              </div>
            </section>
          )}
        </div>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 0.8s linear infinite; display: inline-block; }`}</style>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BoardCustomersPage() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiResult, setAiResult] = useState<{
    tongQuan: string;
    diemNhanhCount: number;
    diemTot: string[];
    canhBao: string[];
    xuHuong: string | null;
    khuyenNghi: string[];
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDetailOpen, setAiDetailOpen] = useState(false);
  const [autoAnalyzePending, setAutoAnalyzePending] = useState(false);
  const [activeTab, setActiveTab] = useState<"quotations" | "contracts" | "care" | "retail">("quotations");
  const [drawer, setDrawer] = useState<DrawerType | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [qFilter, setQFilter] = useState("");
  const [cFilter, setCFilter] = useState("");
  const [rFilter, setRFilter] = useState("");
  const [qYear,   setQYear]   = useState(false);
  const [cYear,   setCYear]   = useState(false);
  const [rYear,   setRYear]   = useState(false);
  const CURRENT_YEAR = new Date().getFullYear();
  const toast = useToast();

  const loadData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    fetch("/api/board/customers")
      .then(r => r.json())
      .then(d => {
        setData(d);
        // Tự động phân tích AI sau khi có dữ liệu
        setAutoAnalyzePending(true);
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Tự động phân tích AI sau khi dữ liệu được tải
  useEffect(() => {
    if (autoAnalyzePending && !loading) {
      setAutoAnalyzePending(false);
      handleAiAnalyze();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyzePending, loading]);

  const stats   = data?.stats;
  const alerts  = data?.alerts;

  // Filtered lists
  const filteredQuotations = useMemo(() => {
    let list = data?.quotations ?? [];
    if (qYear) list = list.filter(q => new Date(q.createdAt).getFullYear() === CURRENT_YEAR);
    return qFilter ? list.filter(q => q.trangThai === qFilter) : list;
  }, [data?.quotations, qFilter, qYear, CURRENT_YEAR]);

  const filteredContracts = useMemo(() => {
    let list = data?.contracts ?? [];
    if (cYear) list = list.filter(c => new Date(c.createdAt).getFullYear() === CURRENT_YEAR);
    return cFilter ? list.filter(c => c.trangThai === cFilter) : list;
  }, [data?.contracts, cFilter, cYear, CURRENT_YEAR]);

  const filteredRetail = useMemo(() => {
    let list = data?.retailInvoices ?? [];
    if (rYear) list = list.filter(r => new Date(r.createdAt).getFullYear() === CURRENT_YEAR);
    if (rFilter === "con-cong-no") return list.filter(r => r.conNo > 0);
    if (rFilter) return list.filter(r => r.trangThai === rFilter);
    return list;
  }, [data?.retailInvoices, rFilter, rYear, CURRENT_YEAR]);

  // Base lists (year-filtered only) — dùng để tính count cho filter pills
  const qBase = useMemo(() => {
    let list = data?.quotations ?? [];
    return qYear ? list.filter(q => new Date(q.createdAt).getFullYear() === CURRENT_YEAR) : list;
  }, [data?.quotations, qYear, CURRENT_YEAR]);

  const cBase = useMemo(() => {
    let list = data?.contracts ?? [];
    return cYear ? list.filter(c => new Date(c.createdAt).getFullYear() === CURRENT_YEAR) : list;
  }, [data?.contracts, cYear, CURRENT_YEAR]);

  const rBase = useMemo(() => {
    let list = data?.retailInvoices ?? [];
    return rYear ? list.filter(r => new Date(r.createdAt).getFullYear() === CURRENT_YEAR) : list;
  }, [data?.retailInvoices, rYear, CURRENT_YEAR]);

  const TABS: TabItem<"quotations" | "contracts" | "care" | "retail">[] = [
    { id: "quotations", label: "Báo giá",     icon: "bi-file-earmark-text" },
    { id: "contracts",  label: "Hợp đồng",   icon: "bi-file-earmark-check" },
    { id: "care",       label: "Chăm sóc",   icon: "bi-headset" },
    { id: "retail",     label: "Bán lẻ",     icon: "bi-receipt" },
  ];

  // Funnel data
  const funnelMax = stats?.totalCustomers ?? 1;
  const wonRate    = stats && stats.quotationSentCount > 0
    ? Math.round(stats.quotationSentCount / (stats.quotationSentCount + stats.quotationWonCount) * 100) + "%"
    : "—";
  const contractRate = stats && stats.quotationWonCount > 0
    ? Math.round(stats.activeContractsCount / stats.quotationWonCount * 100) + "%"
    : "—";

  // Revenue from nguon
  const nguonEntries = Object.entries(stats?.nguonMap ?? {}).sort((a, b) => b[1] - a[1]);
  const nguonMax = nguonEntries[0]?.[1] ?? 1;

  // ── KPI (ngoài card chính) ─────────────────────────────────────────────────
  const kpiContent = (
    <div className="row g-3">
      <KPICard label="Tổng khách hàng"   value={stats?.totalCustomers ?? 0}            icon="bi-people-fill"        accent="#6366f1" colClass="col-6" />
      <KPICard label="Báo giá đang chờ"  value={stats?.quotationSentCount ?? 0}        icon="bi-file-earmark-text"  accent="#f59e0b" colClass="col-6" />
      <KPICard label="HĐ đang thực hiện" value={stats?.activeContractsCount ?? 0}      icon="bi-file-earmark-check" accent="#10b981" colClass="col-6" />
      <KPICard label="Giá trị HĐ active" value={fmt(stats?.contractRevenue ?? 0) + "đ"} icon="bi-currency-exchange" accent="#3b82f6" colClass="col-6" />
    </div>
  );

  // ── Left content ────────────────────────────────────────────────────
  // ── Helper: gọi AI phân tích ─────────────────────────────────────────────────
  const handleAiAnalyze = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);  // Ẩn kết quả cũ khi bắt đầu phân tích mới
    try {
      const current = {
        totalCustomers:  stats?.totalCustomers     ?? 0,
        quotationCount:  (data?.quotations ?? []).length,
        quotationWon:    stats?.quotationWonCount  ?? 0,
        quotationLost:   (data?.quotations ?? []).filter(q => q.trangThai === "lost").length,
        contractCount:   stats?.totalContracts     ?? 0,
        contractActive:  stats?.activeContractsCount ?? 0,
        contractDone:    stats?.doneContractsCount ?? 0,
        contractOverdue: (data?.contracts ?? []).filter(c => c.trangThai === "overdue" || c.trangThai === "delayed").length,
        contractValue:   (data?.contracts ?? []).reduce((s, c) => s + c.giaTriHopDong, 0),
        contractPaid:    (data?.contracts ?? []).reduce((s, c) => s + c.daThanhToan, 0),
        retailCount:     (data?.retailInvoices ?? []).length,
        retailRevenue:   (data?.retailInvoices ?? []).reduce((s, r) => s + r.tongCong, 0),
        retailDebt:      (data?.retailInvoices ?? []).reduce((s, r) => s + r.conNo, 0),
      };
      const res = await fetch("/api/board/ai-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current }),
      });
      const json = await res.json();
      if (json.success) setAiResult(json.data);
      else setAiError(json.error ?? "Lỗi không xác định");
    } catch (e) {
      setAiError(String(e));
    } finally {
      setAiLoading(false);
    }
  };

  // ── Helper: chốt số tháng → lưu snapshot ─────────────────────────────────────
  const handleSaveSnapshot = async () => {
    setAiSaving(true);
    try {
      await fetch("/api/board/sales-snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      toast.success("Chốt số tháng", "Đã lưu số liệu tháng này vào lịch sử thành công!");
    } catch (e) {
      toast.error("Lỗi khi chốt số", String(e));
    } finally {
      setAiSaving(false);
    }
  };

  const healthColor = (score: number) =>
    score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const healthLabel = (score: number) =>
    score >= 70 ? "Tốt" : score >= 40 ? "Cần chú ý" : "Nguy hiểm";

  const leftContent = (
    <div>
      <SectionTitle title="Tổng quan kết quả kinh doanh" className="mb-3" />
      <BarChartHorizontal
        color="#6366f1"
        rowHeight={52}
        data={[
          { label: "Tổng khách hàng",          value: stats?.totalCustomers     ?? 0 },
          { label: "Số báo giá thành công",    value: stats?.quotationWonCount  ?? 0 },
          { label: "Số hợp đồng",              value: stats?.totalContracts     ?? 0 },
          { label: "Số hợp đồng hoàn thành", value: stats?.doneContractsCount ?? 0 },
        ]}
      />

      {/* ── Phân tích kinh doanh bằng trí tuệ nhân tạo ────── */}
      <div style={{ marginTop: 20 }}>
        {/* Dòng nút điều khiển */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, justifyContent: "flex-end" }}>
          <button
            onClick={handleSaveSnapshot}
            disabled={aiSaving}
            title="Chốt số tháng — lưu vào lịch sử để AI so sánh xu hướng"
            style={{
              padding: "3px 9px", borderRadius: 7, border: "1px solid var(--border)",
              background: "var(--muted)", cursor: aiSaving ? "not-allowed" : "pointer",
              fontSize: 10.5, fontWeight: 600, color: "var(--muted-foreground)", opacity: aiSaving ? 0.6 : 1,
            }}
          >
            <i className="bi bi-floppy" style={{ marginRight: 4 }} />
            {aiSaving ? "Đang lưu..." : "Chốt số tháng"}
          </button>
          <button
            onClick={handleAiAnalyze}
            disabled={aiLoading || loading}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 11px", borderRadius: 7, border: "none",
              background: aiLoading ? "var(--muted)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              cursor: aiLoading ? "not-allowed" : "pointer",
              fontSize: 10.5, fontWeight: 700, color: aiLoading ? "var(--muted-foreground)" : "#fff",
              transition: "all 0.2s",
            }}
          >
            <i className={`bi bi-stars${aiLoading ? " spin" : ""}`} style={{ fontSize: 12 }} />
            {aiLoading ? "Đang phân tích..." : "Phân tích"}
          </button>
          {aiResult && (
            <button
              onClick={() => setAiDetailOpen(true)}
              style={{
                padding: "3px 11px", borderRadius: 7, border: "1px solid var(--border)",
                background: "var(--muted)", cursor: "pointer",
                fontSize: 10.5, fontWeight: 700, color: "var(--foreground)",
              }}
            >
              Chi tiết
            </button>
          )}
        </div>

        {/* Lỗi */}
        {aiError && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", fontSize: 11.5, color: "#ef4444" }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }} />{aiError}
          </div>
        )}

        {/* Trạng thái rỗng */}
        {!aiResult && !aiError && !aiLoading && (
          <div style={{
            padding: "14px 12px", borderRadius: 10, border: "1px dashed var(--border)",
            textAlign: "center", color: "var(--muted-foreground)", fontSize: 12,
          }}>
            <i className="bi bi-stars" style={{ fontSize: 20, display: "block", marginBottom: 6, color: "#8b5cf6" }} />
            Nhấn <strong>"Phân tích"</strong> để nhận đánh giá tổng quan<br />
            <span style={{ fontSize: 10.5 }}>Sử dụng Trí tuệ nhân tạo — phân tích dữ liệu thực tế</span>
          </div>
        )}

        {/* Đang tải */}
        {aiLoading && (
          <div style={{ padding: "16px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
            <div style={{ width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
            Trí tuệ nhân tạo đang phân tích dữ liệu...
          </div>
        )}

        {/* Kết quả — chỉ hiện health score + tổng quan */}
        {aiResult && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px",
            borderRadius: 10, background: `${healthColor(aiResult.diemNhanhCount)}12`,
            border: `1px solid ${healthColor(aiResult.diemNhanhCount)}30`,
          }}>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 900, lineHeight: 1, color: healthColor(aiResult.diemNhanhCount) }}>{aiResult.diemNhanhCount}</p>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: healthColor(aiResult.diemNhanhCount), textTransform: "uppercase" }}>/100</p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 800, color: healthColor(aiResult.diemNhanhCount) }}>
                Sức khỏe kinh doanh: {healthLabel(aiResult.diemNhanhCount)}
              </p>
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--foreground)", lineHeight: 1.55 }}>{aiResult.tongQuan}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Right content ─────────────────────────────────────────────────────────────
  const rightContent = (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <SectionTitle title="Chi tiết hoạt động" className="mb-0" />
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          title="Tải lại dữ liệu"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--muted)", cursor: refreshing ? "not-allowed" : "pointer",
            fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
            opacity: refreshing ? 0.6 : 1, transition: "all 0.15s",
          }}
        >
          <i className={`bi bi-arrow-clockwise${refreshing ? " spin" : ""}`} style={{ fontSize: 13 }} />
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>
      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} style={{ marginBottom: 16 }} />

      {/* Tab: Cơ hội (Quotation) */}
      {activeTab === "quotations" && (
        <div>
          {/* Filter pills + year switch */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <FilterBadgeGroup
              value={qFilter}
              onChange={setQFilter}
              options={[
                { value: "",     label: "Tất cả",  count: qBase.length },
                { value: "sent", label: Q_STATUS.sent.label, count: qBase.filter(q => q.trangThai === "sent").length },
                { value: "won",  label: Q_STATUS.won.label,  count: qBase.filter(q => q.trangThai === "won").length },
                { value: "lost", label: Q_STATUS.lost.label, count: qBase.filter(q => q.trangThai === "lost").length },
              ]}
            />
            <div style={{ marginLeft: "auto" }}>
              <YearSwitch year={CURRENT_YEAR} checked={qYear} onChange={() => setQYear(v => !v)} />
            </div>
          </div>
          {(() => {
            const total  = filteredQuotations.reduce((s, q) => s + q.thanhTien, 0);
            const won    = filteredQuotations.filter(q => q.trangThai === "won").reduce((s, q) => s + q.thanhTien, 0);
            const lost   = filteredQuotations.filter(q => q.trangThai === "lost").reduce((s, q) => s + q.thanhTien, 0);
            const lostPct = total > 0 ? Math.round(lost / total * 100) : 0;
            return <StatBar items={[
              { label: "Giá trị đã báo giá (đ)", value: fmtNum(total) },
              { label: "Thành công (đ)",          value: fmtNum(won),  color: "#10b981" },
              { label: "Thất bại (đ)",             value: fmtNum(lost), color: "#ef4444", pct: lostPct },
            ]} />;
          })()}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: "calc(100vh - 280px)", overflowY: "auto", paddingRight: 2 }}>
            {filteredQuotations.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: 24 }}>Không có dữ liệu</p>
            )}
            {filteredQuotations.map(q => {
              const cfg = Q_STATUS[q.trangThai] ?? Q_STATUS.draft;
              return (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
                  <Avatar name={q.customer?.name ?? "KH"} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.customer?.name ?? "Khách hàng"}</p>
                      <StatusBadge {...cfg} />
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                      {q.code ?? "—"} · {q.nguoiPhuTrach?.fullName ?? "Chưa phân công"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#6366f1" }}>{fmt(q.thanhTien)}đ</p>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>{fmtDate(q.ngayBaoGia)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Hợp đồng */}
      {activeTab === "contracts" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <FilterBadgeGroup
              value={cFilter}
              onChange={setCFilter}
              options={[
                { value: "",         label: "Tất cả",           count: cBase.length },
                { value: "pending",  label: C_STATUS.pending.label,  count: cBase.filter(c => c.trangThai === "pending").length },
                { value: "active",   label: C_STATUS.active.label,   count: cBase.filter(c => c.trangThai === "active").length },
                { value: "delayed",  label: C_STATUS.delayed.label,  count: cBase.filter(c => c.trangThai === "delayed").length },
                { value: "overdue",  label: C_STATUS.overdue.label,  count: cBase.filter(c => c.trangThai === "overdue").length },
              ]}
            />
            <div style={{ marginLeft: "auto" }}>
              <YearSwitch year={CURRENT_YEAR} checked={cYear} onChange={() => setCYear(v => !v)} />
            </div>
          </div>
          {(() => {
            const total  = filteredContracts.reduce((s, c) => s + c.giaTriHopDong, 0);
            const daThu  = filteredContracts.reduce((s, c) => s + c.daThanhToan, 0);
            const congNo = total - daThu;
            const noPct  = total > 0 ? Math.round(congNo / total * 100) : 0;
            return <StatBar items={[
              { label: "Giá trị ký hợp đồng (đ)", value: fmtNum(total) },
              { label: "Đã thu (đ)",                value: fmtNum(daThu),  color: "#10b981" },
              { label: "Công nợ còn lại (đ)",      value: fmtNum(congNo), color: "#ef4444", pct: noPct },
            ]} />;
          })()}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: "calc(100vh - 280px)", overflowY: "auto", paddingRight: 2 }}>
            {filteredContracts.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: 24 }}>Không có dữ liệu</p>
            )}
            {filteredContracts.map(c => {
              const cfg = C_STATUS[c.trangThai] ?? C_STATUS.pending;
              const pct = c.giaTriHopDong > 0 ? Math.round(c.daThanhToan / c.giaTriHopDong * 100) : 0;
              // Badge tiến độ thực hiện
              const progressBadge = (() => {
                if (c.trangThai === "done" || c.trangThai === "cancelled" || c.trangThai === "pending") return null;
                if (c.trangThai === "overdue") return { label: "Quá hạn",       color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
                if (c.trangThai === "delayed") return { label: "Chậm tiến độ",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
                if (c.ngayKetThuc) {
                  const daysLeft = daysUntil(c.ngayKetThuc);
                  if (daysLeft < 0)   return { label: "Quá hạn",      color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
                  if (daysLeft <= 30) return { label: "Chậm tiến độ", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
                }
                return { label: "Đúng tiến độ", color: "#10b981", bg: "rgba(16,185,129,0.12)" };
              })();
              return (
                <div key={c.id}
                  onClick={() => setSelectedContract(c)}
                  style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${cfg.color}22`, background: cfg.bg, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <Avatar name={c.customer?.name ?? "KH"} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2, flexWrap: "wrap" }}>
                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.customer?.name ?? "Khách hàng"}</p>
                        <StatusBadge {...cfg} />
                        {progressBadge && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                            color: progressBadge.color, background: progressBadge.bg,
                            whiteSpace: "nowrap", flexShrink: 0,
                          }}>
                            {progressBadge.label}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                        {c.code ?? "—"} · {c.nguoiPhuTrach?.fullName ?? "Chưa phân công"} · Hạn: {fmtDate(c.ngayKetThuc)}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#6366f1" }}>{fmt(c.giaTriHopDong)}đ</p>
                      <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>Đã TT {pct}%</p>
                    </div>
                  </div>
                  {/* Payment progress */}
                  <div style={{ height: 5, background: "var(--muted)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: cfg.color, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Chăm sóc */}
      {activeTab === "care" && (
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>
            Các hoạt động chăm sóc khách hàng gần đây
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 280px)", overflowY: "auto", paddingRight: 2 }}>
          {(data?.careHistories ?? []).length === 0 && (
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: 24 }}>Chưa có lịch sử chăm sóc</p>
          )}
          {(data?.careHistories ?? []).map(h => (
            <div key={h.id} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`bi ${CARE_ICON[h.hinhThuc] ?? "bi-chat-dots-fill"}`} style={{ fontSize: 14, color: "#6366f1" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.customer?.name ?? "—"}</p>
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0 }}>{fmtDate(h.ngayChamSoc)}</span>
                </div>
                <p style={{ margin: "2px 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                  {h.nguoiChamSoc?.fullName ?? "—"}
                  {h.thaiDo && <span style={{ marginLeft: 6, color: THAI_DO_COLOR[h.thaiDo] ?? "#94a3b8", fontWeight: 600 }}>
                    · {h.thaiDo === "tich-cuc" ? "✓ Tích cực" : h.thaiDo === "tieu-cuc" ? "✗ Tiêu cực" : h.thaiDo === "do-du" ? "~ Do dự" : "Trung lập"}
                  </span>}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--foreground)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{h.tomTat}</p>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Tab: Bán lẻ */}
      {activeTab === "retail" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <FilterBadgeGroup
              value={rFilter}
              onChange={setRFilter}
              options={[
                { value: "",             label: "Tất cả",             count: rBase.length },
                { value: "da-xuat-hang", label: RETAIL_STATUS["da-xuat-hang"].label,   count: rBase.filter(r => r.trangThai === "da-xuat-hang").length },
                { value: "chua-xuat-hang", label: RETAIL_STATUS["chua-xuat-hang"].label, count: rBase.filter(r => r.trangThai === "chua-xuat-hang").length },
                { value: "con-cong-no", label: RETAIL_STATUS["con-cong-no"].label,   count: rBase.filter(r => r.conNo > 0).length },
              ]}
            />
            <div style={{ marginLeft: "auto" }}>
              <YearSwitch year={CURRENT_YEAR} checked={rYear} onChange={() => setRYear(v => !v)} />
            </div>
          </div>
          {(() => {
            const daXuat     = filteredRetail.filter(r => r.trangThai === "da-xuat-hang").length;
            const tongThu    = filteredRetail.reduce((s, r) => s + (r.tongCong - r.conNo), 0);
            const congNo     = filteredRetail.reduce((s, r) => s + r.conNo, 0);
            const totalTC    = filteredRetail.reduce((s, r) => s + r.tongCong, 0);
            const noPct      = totalTC > 0 ? Math.round(congNo / totalTC * 100) : 0;
            return <StatBar items={[
              { label: "Giá trị đã xuất hoá đơn (đ)", value: fmtNum(totalTC) },
              { label: "Đã thu (đ)",                    value: fmtNum(tongThu), color: "#10b981" },
              { label: "Công nợ còn lại (đ)",            value: fmtNum(congNo),  color: "#ef4444", pct: noPct },
            ]} />;
          })()}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: "calc(100vh - 280px)", overflowY: "auto", paddingRight: 2 }}>
            {filteredRetail.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: 24 }}>Không có dữ liệu</p>
            )}
            {filteredRetail.map(r => {
              const cfg = r.conNo > 0
                ? RETAIL_STATUS["con-cong-no"]
                : (RETAIL_STATUS[r.trangThai] ?? RETAIL_STATUS["da-xuat-hang"]);
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
                  <Avatar name={r.tenKhach || "Khách lẻ"} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.tenKhach || "Khách lẻ"}
                      </p>
                      <StatusBadge {...cfg} />
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                      {r.code ?? "—"} · {r.nguoiBan?.fullName ?? "Chưa xác định"} · {r.items.length} sản phẩm
                      {r.conNo > 0 && <span style={{ marginLeft: 4, color: "#ef4444", fontWeight: 700 }}>· Nợ: {fmt(r.conNo)}đ</span>}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#6366f1" }}>{fmt(r.tongCong)}đ</p>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>{fmtDate(r.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <SplitLayoutPage
        title="Kinh doanh"
        description="Ban Giám đốc · Phát triển khách hàng · Báo giá · Hợp đồng · Bán lẻ"
        icon="bi-people"
        color="blue"
        leftTopContent={kpiContent}
        leftContent={leftContent}
        rightContent={rightContent}
      />

      {/* Drawers */}
      {drawer && (
        <DetailDrawer
          type={drawer}
          contracts={alerts?.overdueContracts ?? []}
          quotations={alerts?.expiringQuotations ?? []}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* AI detail offcanvas */}
      {aiDetailOpen && aiResult && (
        <AiDetailOffcanvas
          result={aiResult}
          onClose={() => setAiDetailOpen(false)}
          healthColor={healthColor}
          healthLabel={healthLabel}
        />
      )}

      {/* Contract detail offcanvas */}
      {selectedContract && (
        <ContractOffcanvas
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </>
  );
}
