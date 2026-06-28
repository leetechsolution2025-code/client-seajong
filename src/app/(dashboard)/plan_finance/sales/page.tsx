"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { Tab } from "@/components/ui/Tab";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { ChiTietBaoGia, type QuotationForDetail } from "@/components/plan-finance/bao_gia/ChiTietBaoGia";
import { TaoHoaDonBanLe } from "@/components/plan-finance/ban_hang/TaoHoaDonBanLe";
import { ChiTietHopDongOffcanvas } from "@/components/plan-finance/hop_dong/ChiTietHopDongOffcanvas";
import { FilterBadgeGroup } from "@/components/ui/FilterBadge";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Customer { id: string; name: string; dienThoai?: string | null; email?: string | null; address?: string | null }
interface Employee { id: string; fullName: string }

interface Quotation {
  id: string; code: string | null;
  customer: Customer | null;
  nguoiPhuTrach: Employee | null;
  ngayBaoGia: string | null;
  ngayHetHan: string | null;
  trangThai: string; uuTien: string;
  thanhTien: number; createdAt: string;
}

interface Contract {
  id: string; code: string | null;
  customer: Customer | null;
  nguoiPhuTrach: Employee | null;
  quotation: { id: string; code: string | null } | null;
  ngayKy: string | null;
  ngayKetThuc: string | null;
  trangThai: string; uuTien: string;
  giaTriHopDong: number; daThanhToan: number; createdAt: string;
}

interface PagedResult<T> { items: T[]; total: number; page: number; totalPages: number }

// ── Types ─────────────────────────────────────────────────────────────────────
interface SalesStats {
  totalQuotations: number;
  totalQuotationValue: number;
  wonQuotationValue: number;
  conversionRateQuotation: number;
  quotationByStatus: { label: string; value: number }[];
  totalContracts: number;
  totalContractValue: number;
  paidContractValue: number;
  contractByStatus: { label: string; value: number }[];
}

// ── Config ────────────────────────────────────────────────────────────────────
const RIGHT_TABS = [
  { key: "invoice", label: "Hoá đơn bán lẻ" },
  { key: "quotation", label: "Danh sách báo giá" },
  { key: "contract", label: "Danh sách hợp đồng" },
];
const QUOTATION_STATUS_OPTIONS = [
  { label: "Đang trình duyệt", value: "draft" },
  { label: "Đang thương thảo", value: "sent" },
  { label: "Thành công", value: "won" },
  { label: "Thất bại", value: "lost" },
];
const CONTRACT_STATUS_OPTIONS = [
  { label: "Chưa thực hiện", value: "pending" },
  { label: "Đang thực hiện", value: "active" },
  { label: "Hoàn thành",     value: "done" },
  { label: "Tạm dừng",       value: "paused" },
  { label: "Huỷ bỏ",         value: "cancelled" },
];

// ── Badge helpers ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  // Báo giá
  draft:            { label: "Nháp",              color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: "bi-pencil-square" },
  pending_approval: { label: "Đang trình duyệt",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "bi-hourglass-split" },
  approved:         { label: "Đã phê duyệt",      color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  icon: "bi-patch-check-fill" },
  sent:             { label: "Đang thương thảo",  color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  icon: "bi-send-check-fill" },
  won:              { label: "Thành công",          color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: "bi-trophy-fill" },
  lost:             { label: "Thất bại",            color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: "bi-x-circle-fill" },
  // Hợp đồng
  pending:   { label: "Chưa thực hiện", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: "bi-circle" },
  active:    { label: "Đang thực hiện", color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: "bi-play-circle-fill" },
  done:      { label: "Hoàn thành",     color: "#6366f1", bg: "rgba(99,102,241,0.1)",  icon: "bi-check-circle-fill" },
  paused:    { label: "Tạm dừng",       color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "bi-pause-circle-fill" },
  cancelled: { label: "Huỷ bỏ",         color: "#6b7280", bg: "rgba(107,114,128,0.1)", icon: "bi-slash-circle-fill" },
  // Legacy contract statuses
  delayed:   { label: "Chậm tiến độ",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "bi-exclamation-triangle" },
  overdue:   { label: "Quá hạn",        color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: "bi-alarm-fill" },
};

// Timeline steps cho báo giá
const Q_TIMELINE_STEPS = [
  { status: "draft", label: "Tạo nháp" },
  { status: "pending_approval", label: "Trình duyệt" },
  { status: "approved", label: "Phê duyệt" },
  { status: "sent", label: "Đang thương thảo" },
  { status: "won", label: "Chốt thành công" },
];
const Q_TIMELINE_STATUSES = Q_TIMELINE_STEPS.map(s => s.status);
const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  high: { label: "Công việc ưu tiên", color: "#ef4444" },
};


function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtMoney(n: number | undefined | null) {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString("vi-VN");
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, color: "#6366f1", bg: "rgba(99,102,241,0.1)" };
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, whiteSpace: "nowrap",
    }}>{c.label}</span>
  );
}
function PriorityDot({ uuTien }: { uuTien: string }) {
  if (uuTien !== "high") return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
      <i className="bi bi-lightning-charge-fill" style={{ fontSize: 10 }} />
      Công việc ưu tiên
    </span>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────
const QUOTATION_COLUMNS: TableColumn<Quotation>[] = [
  {
    header: "Báo giá",
    render: q => (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", fontSize: 12 }}>
            {q.code ?? "—"}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
          {q.customer?.name ?? "—"}
        </div>
      </div>
    ),
  },
  {
    header: "Ngày",
    width: 120,
    render: q => (
      <div style={{ fontSize: 12 }}>
        <div style={{ color: "var(--foreground)", whiteSpace: "nowrap" }}>{fmtDate(q.ngayBaoGia)}</div>
        {q.ngayHetHan && (
          <div style={{ color: "var(--muted-foreground)", whiteSpace: "nowrap", marginTop: 2 }}>
            HH: {fmtDate(q.ngayHetHan)}
          </div>
        )}
      </div>
    ),
  },
  {
    header: "Trạng thái",
    width: 130,
    render: q => (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <StatusBadge status={q.trangThai} />
        <PriorityDot uuTien={q.uuTien} />
      </div>
    ),
  },
];

const CONTRACT_COLUMNS: TableColumn<Contract>[] = [
  {
    header: "Hợp đồng",
    render: c => (
      <div>
        <div style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", fontSize: 12 }}>
          {c.code ?? "—"}
        </div>
        <div style={{ fontSize: 11, color: "var(--foreground)", fontWeight: 600, marginTop: 1 }}>
          {c.customer?.name ?? "—"}
        </div>
        {c.quotation?.code && (
          <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 1 }}>
            BG: {c.quotation.code}
          </div>
        )}
      </div>
    ),
  },
  {
    header: "Ngày",
    width: 120,
    render: c => (
      <div style={{ fontSize: 12 }}>
        <div style={{ color: "var(--foreground)", whiteSpace: "nowrap" }}>
          {fmtDate(c.ngayKy) !== "—" ? `Ký: ${fmtDate(c.ngayKy)}` : "—"}
        </div>
        {c.ngayKetThuc && (
          <div style={{ color: "var(--muted-foreground)", whiteSpace: "nowrap", marginTop: 2 }}>
            HH: {fmtDate(c.ngayKetThuc)}
          </div>
        )}
      </div>
    ),
  },
  {
    header: "Trạng thái",
    width: 130,
    render: c => (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <StatusBadge status={c.trangThai} />
        <PriorityDot uuTien={c.uuTien} />
      </div>
    ),
  },
];

// ── Reusable fetch hook ───────────────────────────────────────────────────────
function usePaginatedFetch<T>(url: string, filters: { status: string; priority: string; search: string }) {
  const [data, setData] = useState<PagedResult<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [page, setPage] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFilters = useRef(filters);
  const isFirst = useRef(true);

  const load = useCallback(async (p: number, s: string, st: string, pr: string) => {
    if (isFirst.current) { setLoading(true); } else { setFetching(true); }
    isFirst.current = false;
    const q = new URLSearchParams({ page: String(p), search: s, trangThai: st, uuTien: pr });
    try {
      const res = await fetch(`${url}?${q}`);
      setData(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [url]);

  useEffect(() => {
    const cur = filters;
    const changed =
      cur.status !== prevFilters.current.status ||
      cur.priority !== prevFilters.current.priority ||
      cur.search !== prevFilters.current.search;
    prevFilters.current = cur;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (changed) {
      timerRef.current = setTimeout(() => { setPage(1); load(1, cur.search, cur.status, cur.priority); }, 250);
    } else {
      load(page, cur.search, cur.status, cur.priority);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.priority, filters.search, page, load]);

  const refresh = useCallback(() => {
    load(page, filters.search, filters.status, filters.priority);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, page, filters.search, filters.status, filters.priority]);

  return { data, loading, fetching, page, setPage, refresh };
}

// ── Quotation Table ───────────────────────────────────────────────────────────
function QuotationTable({ status, priority, search }: { status: string; priority: string; search: string }) {
  const { data, loading, fetching, page, setPage, refresh } = usePaginatedFetch<Quotation>(
    "/api/plan-finance/quotations",
    { status, priority, search },
  );
  const [selectedQ, setSelectedQ] = useState<QuotationForDetail | null>(null);

  // Refresh list sau khi sửa / xoá
  const handleSaved = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      <div>
        <Table
          rows={data?.items ?? []}
          columns={QUOTATION_COLUMNS}
          loading={loading}
          fetching={fetching}
          rowKey={q => q.id}
          emptyIcon="bi-file-earmark-text"
          emptyText="Chưa có báo giá nào"
          skeletonRows={5}
          onRowClick={setSelectedQ}
        />
        <Pagination
          page={page}
          totalPages={data?.totalPages ?? 1}
          onChange={setPage}
        />
      </div>
      <ChiTietBaoGia q={selectedQ} onClose={() => setSelectedQ(null)} onDeleted={handleSaved} />
    </>
  );
}

// ── Contract Table ────────────────────────────────────────────────────────────
function ContractTable({ status, priority, search }: { status: string; priority: string; search: string }) {
  const { data, loading, fetching, page, setPage, refresh } = usePaginatedFetch<Contract>(
    "/api/plan-finance/contracts",
    { status, priority, search },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <div>
        <Table
          rows={data?.items ?? []}
          columns={CONTRACT_COLUMNS}
          loading={loading}
          fetching={fetching}
          rowKey={c => c.id}
          emptyIcon="bi-file-earmark-x"
          emptyText="Chưa có hợp đồng nào"
          skeletonRows={5}
          onRowClick={c => setSelectedId(c.id)}
        />
        <Pagination
          page={page}
          totalPages={data?.totalPages ?? 1}
          onChange={setPage}
        />
      </div>
      <ChiTietHopDongOffcanvas
        contractId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => { refresh(); }}
      />
    </>
  );
}

// ── Retail Invoice Table — format tiền đúng vi-VN ─────────────────────────────────
interface RetailInvoice {
  id: string; code: string | null;
  tenKhach: string | null; dienThoai: string | null;
  tongCong: number; conNo: number; hinhThucTT: string;
  trangThai: string; createdAt: string;
  items: { id: string }[];
}

const PAYMENT_LABEL: Record<string, { label: string; icon: string; color: string }> = {
  cash:     { label: "Tiền mặt",    icon: "bi-cash",       color: "#10b981" },
  transfer: { label: "Chuyển khoản", icon: "bi-bank",       color: "#3b82f6" },
  card:     { label: "Thẻ",          icon: "bi-credit-card",color: "#8b5cf6" },
  ewallet:  { label: "Ví điện tử",   icon: "bi-phone",      color: "#f59e0b" },
};

const INVOICE_COLUMNS: TableColumn<RetailInvoice>[] = [
  {
    header: "Hoá đơn",
    render: inv => (
      <div style={{ whiteSpace: "nowrap" }}>
        <div style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", fontSize: 12 }}>
          {inv.code ?? "—"}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
          {inv.tenKhach ?? "Khách lẻ"}{inv.dienThoai ? ` · ${inv.dienThoai}` : ""}
        </div>
      </div>
    ),
  },
  {
    header: "Thời gian",
    width: 110,
    render: inv => (
      <div style={{ fontSize: 12, whiteSpace: "nowrap" }}>
        <div>{fmtDate(inv.createdAt)}</div>
        <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
          {new Date(inv.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    ),
  },
  {
    header: "Tổng tiền",
    width: 130,
    render: inv => (
      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)", whiteSpace: "nowrap", textAlign: "right", display: "block" }}>
        {inv.tongCong.toLocaleString("vi-VN")}₫
      </span>
    ),
  },
];

function RetailInvoiceTable({ search, status, onStatusChange, refreshKey }: {
  search: string; status: string;
  onStatusChange: (v: string) => void;
  refreshKey: number;
}) {
  const [data, setData] = useState<{
    items: RetailInvoice[]; total: number; totalPages: number;
    statusCounts?: {
      all: number;
      byStatus: { code: string; name: string; color: string | null; count: number }[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), search });
    if (status) q.set("trangThai", status);
    fetch(`/api/plan-finance/retail-invoices?${q}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, status, refreshKey]);

  // reset page khi filter thay đổi
  useEffect(() => { setPage(1); }, [search, status]);

  return (
    <div>
      {/* FilterBadge trạng thái — lấy từ Category DB */}
      <FilterBadgeGroup
        value={status}
        onChange={onStatusChange}
        options={[
          { value: "", label: "Tất cả", count: data?.statusCounts?.all ?? 0 },
          ...(data?.statusCounts?.byStatus ?? []).map(s => ({
            value: s.code,
            label: s.name,
            count: s.count,
            activeColor: s.color ?? undefined,
          })),
        ]}
        style={{ marginBottom: 10 }}
      />
      <Table
        rows={data?.items ?? []}
        columns={INVOICE_COLUMNS}
        loading={loading}
        fetching={false}
        rowKey={inv => inv.id}
        emptyIcon="bi-receipt"
        emptyText="Chưa có hoá đơn nào"
        skeletonRows={5}
      />
      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 1}
        onChange={setPage}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const [rightTab, setRightTab] = useState("invoice");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);

  const [iSearch, setISearch] = useState("");
  const [iStatus, setIStatus] = useState("");

  const [qStatus, setQStatus] = useState("");
  const [qPriority, setQPriority] = useState("");
  const [qSearch, setQSearch] = useState("");

  const [cStatus, setCStatus] = useState("");
  const [cPriority, setCPriority] = useState("");
  const [cSearch, setCSearch] = useState("");

  // ── Stats từ DB
  const [stats, setStats] = useState<SalesStats | null>(null);
  const fetchStats = useCallback(() => {
    fetch("/api/plan-finance/stats", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d && !d.error) setStats(d); })
      .catch(() => {});
  }, []);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Ư u tiên từ Category DB
  const [priorityOptions, setPriorityOptions] = useState<{ label: string; value: string }[]>([]);
  useEffect(() => {
    fetch("/api/plan-finance/categories?type=m_c_u_ti_n")
      .then(r => r.json())
      .then((d: { code: string; name: string }[]) => {
        if (Array.isArray(d)) setPriorityOptions(d.map(c => ({ label: c.name, value: c.code })));
      })
      .catch(() => {});
  }, []);

  const fmtMoney = (n: number) =>
    n >= 1_000_000_000 ? (n / 1_000_000_000).toFixed(1) + " tỷ"
    : n >= 1_000_000   ? (n / 1_000_000).toFixed(0) + " tr"
    : n.toLocaleString("vi-VN") + " ₫";

  return (
    <>
      <TaoHoaDonBanLe
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        onSaved={() => { setInvoiceOpen(false); setInvoiceRefreshKey(k => k + 1); }}
      />
      <SplitLayoutPage
        title="Bán hàng"
        description="Quản lý đơn hàng, doanh thu và báo cáo bán hàng"
        icon="bi-cart3"
        color="emerald"
        leftTopContent={
          <div className="row g-3">
            <KPICard
              label="Đã báo giá"
              value={stats ? `${stats.totalQuotations}` : "—"}
              icon="bi-file-earmark-text-fill"
              accent="#10b981"
              colClass="col-6"
              subtitle={stats ? `${fmtMoney(stats.totalQuotationValue)}` : undefined}
            />
            <KPICard
              label="Đã ký hợp đồng"
              value={stats ? `${stats.totalContracts}` : "—"}
              icon="bi-file-earmark-check-fill"
              accent="#2563eb"
              colClass="col-6"
              subtitle={stats ? `${fmtMoney(stats.totalContractValue)}` : undefined}
            />
          </div>
        }
        leftContent={
          <>
            <SectionTitle title="Cơ cấu báo giá" />
            <BarChartHorizontal
              data={stats?.quotationByStatus ?? [
                { label: "Đang trình duyệt", value: 0 },
                { label: "Đã gửii khách hàng", value: 0 },
                { label: "Thành công", value: 0 },
                { label: "Thất bại", value: 0 },
              ]}
              color="#10b981"
              rowHeight={48}
            />
            <SectionTitle title="Cơ cấu hợp đồng" className="mt-4" />
            <BarChartHorizontal
              data={stats?.contractByStatus ?? [
                { label: "Chờ ký", value: 0 },
                { label: "Đang thực hiện", value: 0 },
                { label: "Chậm tiến độ", value: 0 },
                { label: "Quá hạn", value: 0 },
              ]}
              color="#2563eb"
              rowHeight={48}
            />
          </>
        }
        rightContent={
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            {/* Tab header + nút tạo mới */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <Tab tabs={RIGHT_TABS} active={rightTab} onChange={setRightTab} />
              {(rightTab === "invoice" || rightTab === "contract") && (
                <button
                  onClick={() => rightTab === "invoice" && setInvoiceOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", fontSize: 13, fontWeight: 600,
                    background: "var(--primary)", color: "#fff",
                    border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <i className="bi bi-plus-lg" style={{ fontSize: 14 }} />
                  Tạo mới
                </button>
              )}
            </div>

            {/* Toolbar lọc */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 8, flexShrink: 0 }}>
              {rightTab === "invoice" && (
                <>
                  <SearchInput value={iSearch} onChange={setISearch} placeholder="Tìm hoá đơn..." />
                </>
              )}
              {rightTab === "quotation" && (
                <>
                  <FilterSelect options={QUOTATION_STATUS_OPTIONS} value={qStatus} onChange={setQStatus} placeholder="Trạng thái" />
                  <FilterSelect options={priorityOptions} value={qPriority} onChange={setQPriority} placeholder="Ưu tiên" />
                  <SearchInput value={qSearch} onChange={setQSearch} placeholder="Tìm báo giá..." />
                </>
              )}
              {rightTab === "contract" && (
                <>
                  <FilterSelect options={CONTRACT_STATUS_OPTIONS} value={cStatus} onChange={setCStatus} placeholder="Trạng thái" />
                  <FilterSelect options={priorityOptions} value={cPriority} onChange={setCPriority} placeholder="Ưu tiên" />
                  <SearchInput value={cSearch} onChange={setCSearch} placeholder="Tìm hợp đồng..." />
                </>
              )}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {rightTab === "invoice" && (
                <RetailInvoiceTable search={iSearch} status={iStatus} onStatusChange={setIStatus} refreshKey={invoiceRefreshKey} />
              )}
              {rightTab === "quotation" && (
                <QuotationTable status={qStatus} priority={qPriority} search={qSearch} />
              )}
              {rightTab === "contract" && (
                <ContractTable status={cStatus} priority={cPriority} search={cSearch} />
              )}
            </div>
          </div>
        }
      />
    </>
  );
}
