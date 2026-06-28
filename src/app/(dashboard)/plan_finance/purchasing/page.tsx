"use client";
import React from "react";
import { SplitLayoutPage }    from "@/components/layout/SplitLayoutPage";
import { SectionTitle }       from "@/components/ui/SectionTitle";
import { KPICard }            from "@/components/ui/KPICard";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { Tab }                from "@/components/ui/Tab";
import { FilterSelect }       from "@/components/ui/FilterSelect";
import { SearchInput }        from "@/components/ui/SearchInput";
import { Pagination }         from "@/components/ui/Pagination";
import { Table, TableColumn } from "@/components/ui/Table";
import { TaoYeuCauMuaHangModal } from "@/components/plan-finance/mua_hang/TaoYeuCauMuaHangModal";
import TaoDonMuaHangModal        from "@/components/plan-finance/mua_hang/TaoDonMuaHangModal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PurchaseRequest {
  id:           string;
  code:         string | null;
  ngayTao:      string;
  ngayCanCo:    string | null;
  nguoiYeuCau:  string;
  donVi:        string;
  soMatHang:    number;
  lyDo:         string | null;
  trangThai:    string;
}

interface PurchaseOrder {
  id:          string;
  code:        string | null;
  supplier?:   { name: string } | null;
  ngayDat:     string | null;
  ngayNhan:    string | null;
  trangThai:   string;
  tongTien:    number;
  daThanhToan: number;
}

// ── Status badge helper ───────────────────────────────────────────────────────
const REQ_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "chua-xu-ly": { label: "Chưa xử lý",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  "dang-xu-ly": { label: "Đang xử lý",  color: "#6366f1", bg: "rgba(99,102,241,0.1)"  },
  "da-xu-ly":   { label: "Đã xử lý",    color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  "tu-choi":    { label: "Từ chối",     color: "#f43f5e", bg: "rgba(244,63,94,0.1)"   },
};

const ORD_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "draft":     { label: "Đang tạo đơn",   color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  "ordered":   { label: "Đã đặt hàng",    color: "#6366f1", bg: "rgba(99,102,241,0.1)"  },
  "received":  { label: "Đã nhận hàng",   color: "#0284c7", bg: "rgba(2,132,199,0.1)"   },
  "disputed":  { label: "Đang khiếu nại", color: "#f43f5e", bg: "rgba(244,63,94,0.1)"   },
  "completed": { label: "Hoàn thành",     color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  "paused":    { label: "Tạm dừng",       color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  "cancelled": { label: "Huỷ bỏ",         color: "#64748b", bg: "rgba(100,116,139,0.1)" },
};

function Badge({ map, value }: { map: Record<string, { label: string; color: string; bg: string }>; value: string }) {
  const s = map[value] ?? { label: value, color: "var(--muted-foreground)", bg: "var(--muted)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700, color: s.color, background: s.bg, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("vi-VN") : "—";
const fmtVnd = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(".", ",") + " tỷ ₫";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0) + " tr ₫";
  return n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";
};
const fmtKpi = (n: number) => Math.round(n).toLocaleString("vi-VN");

const actionBtn = (label = "Xem") => (
  <button style={{ padding: "4px 10px", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--muted)", borderRadius: 6, fontSize: 12, cursor: "pointer", color: "var(--foreground)" }}>
    {label}
  </button>
);

// ── Column definitions ────────────────────────────────────────────────────────
const REQ_COLUMNS: TableColumn<PurchaseRequest>[] = [
  {
    header: "Mã yêu cầu",
    render: r => (
      <div>
        <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 12.5, color: "var(--primary)" }}>{r.code}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 2 }}>{r.donVi}</div>
      </div>
    ),
  },
  { header: "Số mặt hàng", align: "center", width: 100, render: r => <><span style={{ fontWeight: 700 }}>{r.soMatHang}</span><span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 3 }}>mục</span></> },
  { header: "Lý do", render: r => <span title={r.lyDo ?? ""} style={{ color: "var(--muted-foreground)", fontSize: 12.5, display: "block", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lyDo ?? "—"}</span> },
  { header: "Trạng thái",  align: "center", render: r => <Badge map={REQ_STATUS} value={r.trangThai} /> },
];

const ORD_COLUMNS: TableColumn<PurchaseOrder>[] = [
  { header: "Mã đơn",       render: o => <span style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 12.5, color: "var(--primary)" }}>{o.code ?? "—"}</span> },
  { header: "Nhà cung cấp", render: o => o.supplier?.name ?? <span style={{ color: "var(--muted-foreground)" }}>—</span> },
  { header: "Ngày đặt",     render: o => <span style={{ color: "var(--muted-foreground)", fontSize: 12.5 }}>{fmtDate(o.ngayDat)}</span> },
  { header: "Ngày giao DK", render: o => <span style={{ color: "var(--muted-foreground)", fontSize: 12.5 }}>{fmtDate(o.ngayNhan)}</span> },
  { header: "Tổng tiền",    align: "right", render: o => <span style={{ fontWeight: 700 }}>{fmtVnd(o.tongTien)}</span> },
  { header: "Đã TT",        align: "right", render: o => o.daThanhToan > 0 ? <span style={{ color: "#10b981", fontWeight: 600 }}>{fmtVnd(o.daThanhToan)}</span> : <span style={{ color: "var(--muted-foreground)" }}>—</span> },
  { header: "Trạng thái",   align: "center", render: o => <Badge map={ORD_STATUS} value={o.trangThai} /> },
  { header: "",             align: "center", width: 70, render: () => actionBtn() },
];

// ── Stats type ────────────────────────────────────────────────────────────────
interface PurchasingStats {
  tongChiPhiNam:   number;
  chiPhiThang:     number;
  trangThaiDon:    { label: string; value: number }[];
  trangThaiYeuCau: { label: string; value: number }[];
}
const REQ_STATUSES = [
  { label: "Chưa xử lý", value: "chua-xu-ly" }, { label: "Đang xử lý", value: "dang-xu-ly" },
  { label: "Đã xử lý",   value: "da-xu-ly"   }, { label: "Từ chối",    value: "tu-choi"    },
];
const ORD_STATUSES = [
  { label: "Đang tạo đơn",   value: "draft"     },
  { label: "Đã đặt hàng",    value: "ordered"   },
  { label: "Đã nhận hàng",   value: "received"  },
  { label: "Đang khiếu nại", value: "disputed"  },
  { label: "Hoàn thành",     value: "completed" },
  { label: "Tạm dừng",       value: "paused"    },
  { label: "Huỷ bỏ",         value: "cancelled" },
];
const PAGE_SIZE = 7;

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PurchasingPage() {
  const [stats,        setStats]        = React.useState<PurchasingStats | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [activeTab, setActiveTab]   = React.useState("requests");
  const [requests,    setRequests]    = React.useState<PurchaseRequest[]>([]);
  const [reqTotal,    setReqTotal]    = React.useState(0);
  const [reqLoading,  setReqLoading]  = React.useState(false);
  const [reqStatus, setReqStatus]   = React.useState("");
  const [reqDonVi,  setReqDonVi]    = React.useState("");
  const [reqSearch, setReqSearch]   = React.useState("");
  const [reqPage,   setReqPage]     = React.useState(1);
  const [donViOptions, setDonViOptions] = React.useState<{label:string;value:string}[]>([]);
  const [ordStatus, setOrdStatus]   = React.useState("");
  const [ordSearch, setOrdSearch]   = React.useState("");
  const [ordPage,   setOrdPage]     = React.useState(1);
  const [orders,    setOrders]      = React.useState<PurchaseOrder[]>([]);
  const [ordTotal,  setOrdTotal]    = React.useState(0);
  const [ordLoading, setOrdLoading] = React.useState(false);
  const [selectedReq, setSelectedReq] = React.useState<PurchaseRequest | null>(null);
  const [taoYeuCauOpen, setTaoYeuCauOpen] = React.useState(false);
  // State cho TaoDonMuaHangModal — lift ra page level để offcanvas có thể đóng độc lập
  const [createOrderData, setCreateOrderData] = React.useState<{
    reqId: string; reqCode: string | null;
    items: ReqDetail["items"];
  } | null>(null);
  const isReq = activeTab === "requests";

  // Fetch stats
  React.useEffect(() => {
    fetch("/api/plan-finance/purchasing/stats")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // Fetch purchase requests
  const fetchRequests = React.useCallback(() => {
    if (activeTab !== "requests") return;
    setReqLoading(true);
    const p = new URLSearchParams();
    if (reqStatus) p.set("status", reqStatus);
    if (reqDonVi)  p.set("donVi",  reqDonVi);
    if (reqSearch) p.set("search", reqSearch);
    p.set("page", String(reqPage));
    fetch(`/api/plan-finance/purchase-requests?${p}`)
      .then(r => r.json())
      .then(d => { setRequests(d.items ?? []); setReqTotal(d.total ?? 0); })
      .catch(() => setRequests([]))
      .finally(() => setReqLoading(false));
  }, [activeTab, reqStatus, reqDonVi, reqSearch, reqPage]);

  React.useEffect(() => { fetchRequests(); }, [fetchRequests]);
  React.useEffect(() => { setReqPage(1); }, [reqStatus, reqDonVi, reqSearch, activeTab]);

  // Fetch unique donVi from API for filter dropdown
  React.useEffect(() => {
    fetch("/api/plan-finance/purchase-requests?page=1&limit=200")
      .then(r => r.json())
      .then(d => {
        const unique = Array.from(new Set((d.items ?? []).map((r: PurchaseRequest) => r.donVi)))
          .filter(Boolean).sort() as string[];
        setDonViOptions(unique.map(v => ({ label: v, value: v })));
      })
      .catch(() => {});
  }, []);

  // Fetch orders
  const fetchOrders = React.useCallback(() => {
    setOrdLoading(true);
    const p = new URLSearchParams();
    if (ordStatus) p.set("trangThai", ordStatus);
    if (ordSearch) p.set("search",   ordSearch);
    p.set("page", String(ordPage));
    fetch(`/api/plan-finance/purchasing?${p}`)
      .then(r => r.json())
      .then(d => { setOrders(d.items ?? []); setOrdTotal(d.total ?? 0); })
      .catch(err => { console.error("[fetchOrders]", err); setOrders([]); })
      .finally(() => setOrdLoading(false));
  }, [ordStatus, ordSearch, ordPage]);

  React.useEffect(() => {
    if (activeTab !== "orders") return;
    fetchOrders();
  }, [activeTab, fetchOrders]);

  React.useEffect(() => { setOrdPage(1); }, [ordStatus, ordSearch]);

  const reqTotalPages = Math.max(1, Math.ceil(reqTotal / PAGE_SIZE));
  const ordTotalPages = Math.max(1, Math.ceil(ordTotal / PAGE_SIZE));

  return (
    <>
    <SplitLayoutPage
      title="Mua hàng"
      description="Quản lý yêu cầu mua hàng, đơn đặt hàng và theo dõi nhà cung cấp"
      icon="bi-bag" color="violet"

      leftTopContent={
        <div className="row g-2">
          <KPICard label="Tổng chi phí năm"  value={statsLoading ? "—" : fmtKpi(stats?.tongChiPhiNam ?? 0)} icon="bi-graph-up-arrow"   accent="#6366f1" colClass="col-6" />
          <KPICard label="Chi phí tháng này" value={statsLoading ? "—" : fmtKpi(stats?.chiPhiThang   ?? 0)} icon="bi-calendar2-month" accent="#10b981" colClass="col-6" />
        </div>
      }

      leftContent={
        <div>
          <SectionTitle title="Trạng thái đơn mua hàng" />
          {statsLoading
            ? <div style={{ height: 4 * 48 + 25, borderRadius: 8, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />
            : <BarChartHorizontal data={stats?.trangThaiDon ?? []} color="#6366f1" />}
          <SectionTitle title="Trạng thái yêu cầu mua hàng" />
          {statsLoading
            ? <div style={{ height: 4 * 48 + 25, borderRadius: 8, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />
            : <BarChartHorizontal data={stats?.trangThaiYeuCau ?? []} color="#f59e0b" />}
        </div>
      }

      rightContent={
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>

          <Tab
            tabs={[
              { key: "requests", label: "Danh sách yêu cầu mua hàng" },
              { key: "orders",   label: "Danh sách đơn mua hàng"     },
            ]}
            active={activeTab} onChange={setActiveTab}
          />

          {/* Filter row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <FilterSelect
              options={isReq ? REQ_STATUSES : ORD_STATUSES}
              value={isReq ? reqStatus : ordStatus}
              onChange={isReq ? setReqStatus : setOrdStatus}
              placeholder="Trạng thái"
            />
            {isReq && (
              <FilterSelect
                options={donViOptions}
                value={reqDonVi}
                onChange={setReqDonVi}
                placeholder="Đơn vị yêu cầu"
              />
            )}
            <SearchInput
              value={isReq ? reqSearch : ordSearch}
              onChange={isReq ? setReqSearch : setOrdSearch}
              placeholder={isReq ? "Tìm yêu cầu..." : "Tìm đơn mua..."}
            />
            <button
              onClick={() => isReq ? setTaoYeuCauOpen(true) : undefined}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", border: "none", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <i className="bi bi-plus-lg" style={{ fontSize: 13 }} />
              {isReq ? "Tạo yêu cầu" : "Tạo đơn mua"}
            </button>
          </div>

          {/* Tables */}
          {activeTab === "requests" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <Table<PurchaseRequest>
                rows={requests}
                columns={REQ_COLUMNS}
                loading={reqLoading}
                rowKey={r => r.id}
                onRowClick={setSelectedReq}
                emptyIcon="bi-ui-checks"
                emptyText="Không có yêu cầu mua hàng nào"
                minWidth={560}
                compact
              />
              <Pagination page={reqPage} totalPages={reqTotalPages} onChange={setReqPage} />
            </div>
          )}

          {activeTab === "orders" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <Table<PurchaseOrder>
                rows={orders}
                columns={ORD_COLUMNS}
                loading={ordLoading}
                rowKey={o => o.id}
                emptyIcon="bi-file-earmark-text"
                emptyText="Chưa có đơn mua hàng nào"
                minWidth={800}
              />
              <Pagination page={ordPage} totalPages={ordTotalPages} onChange={setOrdPage} />
            </div>
          )}
        </div>
      }
    />

    {/* ── Offcanvas chi tiết yêu cầu mua hàng ─────────────────────── */}
    {selectedReq && (
      <ReqDetailOffcanvas
        req={selectedReq}
        onClose={() => setSelectedReq(null)}
        onChanged={fetchRequests}
        onOrderCreated={() => { setActiveTab("orders"); setOrdPage(1); fetchOrders(); }}
        onCreateOrder={(reqId, reqCode, items) => {
          setSelectedReq(null);
          setCreateOrderData({ reqId, reqCode, items });
        }}
      />
    )}
    {taoYeuCauOpen && (
      <TaoYeuCauMuaHangModal
        onClose={() => setTaoYeuCauOpen(false)}
        onSaved={() => { setTaoYeuCauOpen(false); fetchRequests(); }}
      />
    )}

    {/* Modal tạo đơn mua — ở page level, độc lập với offcanvas */}
    {createOrderData && (
      <TaoDonMuaHangModal
        reqId={createOrderData.reqId}
        reqCode={createOrderData.reqCode}
        items={createOrderData.items}
        onClose={() => setCreateOrderData(null)}
        onCreated={() => {
          setCreateOrderData(null);
          fetchRequests();
          setActiveTab("orders");
          setOrdPage(1);
          fetchOrders();
        }}
      />
    )}
    </>
  );
}

// ── Offcanvas chi tiết yêu cầu ────────────────────────────────────────────────
interface ReqDetail {
  id: string; code: string | null;
  nguoiYeuCau: string; donVi: string;
  ngayTao: string; ngayCanCo: string | null;
  lyDo: string | null; trangThai: string;
  items: Array<{
    id: string; tenHang: string; donVi: string | null;
    soLuong: number; donGiaDK: number;
    inventoryItemId: string | null;
    trangThaiXuLy: string;  // cho-xu-ly | da-tao-don | bo-qua
    supplierId: string | null;
    inventoryItem: { code: string | null; tenHang: string; donVi: string | null; categoryId: string | null; thongSoKyThuat: string | null } | null;
  }>;
}

function ReqDetailOffcanvas({ req, onClose, onChanged, onOrderCreated, onCreateOrder }: {
  req: PurchaseRequest;
  onClose: () => void;
  onChanged?: () => void;
  onOrderCreated?: () => void;
  onCreateOrder?: (reqId: string, reqCode: string | null, items: ReqDetail["items"]) => void;
}) {
  const [detail, setDetail]       = React.useState<ReqDetail | null>(null);
  const [loading, setLoading]     = React.useState(true);
  const [rejecting, setRejecting] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState(req.trangThai);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/plan-finance/purchase-requests/${req.id}`)
      .then(r => r.json())
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [req.id]);

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12.5, color: "var(--muted-foreground)", fontWeight: 500, flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );

  const totalDK = detail?.items.reduce((s, i) => s + i.soLuong * i.donGiaDK, 0) ?? 0;
  const s = REQ_STATUS[currentStatus] ?? { label: currentStatus, color: "var(--muted-foreground)", bg: "var(--muted)" };
  const isLocked = currentStatus === "da-xu-ly" || currentStatus === "tu-choi";

  const handleReject = async () => {
    if (rejecting) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/plan-finance/purchase-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: "tu-choi" }),
      });
      if (res.ok) { setCurrentStatus("tu-choi"); onChanged?.(); }
    } finally { setRejecting(false); }
  };

  const [reactivating, setReactivating] = React.useState(false);
  const handleReactivate = async () => {
    if (reactivating) return;
    setReactivating(true);
    try {
      const res = await fetch(`/api/plan-finance/purchase-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: "chua-xu-ly" }),
      });
      if (res.ok) { setCurrentStatus("chua-xu-ly"); onChanged?.(); }
    } finally { setReactivating(false); }
  };
  const fmtVnd = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";

  const handleOrderCreated = () => {
    // Refresh detail (items status) và phiếu YC
    setLoading(true);
    fetch(`/api/plan-finance/purchase-requests/${req.id}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setCurrentStatus(d.trangThai); })
      .catch(() => {})
      .finally(() => setLoading(false));
    onChanged?.();
    onOrderCreated?.(); // Switch sang tab orders và refresh
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1040, background: "rgba(0,0,0,0.3)" }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, minWidth: 400, maxWidth: 400, zIndex: 1050,
        background: "var(--card)", borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.12)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-ui-checks" style={{ fontSize: 16, color: "#f59e0b" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>Chi tiết yêu cầu mua hàng</p>
            <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{req.code ?? req.id}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0 }}>
            <i className="bi bi-x" style={{ fontSize: 17 }} />
          </button>
        </div>

        {/* Status bar */}
        <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)", background: s.bg }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>Trạng thái:</span>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: s.color, background: "rgba(255,255,255,0.6)" }}>
            {s.label}
          </span>
        </div>

        {/* Body — thông tin chung (fixed, không scroll) */}
        <div style={{ padding: "4px 20px 0", flexShrink: 0 }}>
          <Row label="Mã yêu cầu"    value={<span style={{ fontFamily: "monospace", color: "var(--primary)" }}>{req.code ?? "—"}</span>} />
          <Row label="Đơn vị YC"     value={req.donVi} />
          <Row label="Người yêu cầu" value={req.nguoiYeuCau} />
          <Row label="Ngày tạo"      value={new Date(req.ngayTao).toLocaleDateString("vi-VN")} />
          <Row label="Ngày cần có"   value={req.ngayCanCo ? new Date(req.ngayCanCo).toLocaleDateString("vi-VN") : "—"} />
          <Row label="Lý do"         value={<span style={{ maxWidth: 260, textAlign: "right", display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{req.lyDo ?? "—"}</span>} />
        </div>

        {/* Header danh sách + tổng dự kiến (fixed) */}
        <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
              Danh sách mặt hàng yêu cầu
              {!loading && detail && (
                <span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted-foreground)", marginLeft: 6 }}>
                  {detail.items.length} mục
                </span>
              )}
            </p>
            {/* Tổng dự kiến — hiển thị ngay trên danh sách */}
            {!loading && totalDK > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: 8,
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted-foreground)" }}>Tổng DK:</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>{fmtVnd(totalDK)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Danh sách mặt hàng — chỉ phần này scroll */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 58, borderRadius: 8, background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ) : !detail?.items.length ? (
            <div style={{ padding: "20px 16px", background: "var(--muted)", borderRadius: 8, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
              <i className="bi bi-box" style={{ fontSize: 22, display: "block", marginBottom: 6, opacity: 0.4 }} />
              Không có mặt hàng nào
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {detail.items.map((item, idx) => {
                const isDone   = item.trangThaiXuLy === "da-tao-don";
                const isSkip   = item.trangThaiXuLy === "bo-qua";
                return (
                <div key={item.id} style={{
                  padding: "6px 10px", borderRadius: 7,
                  border: `1px solid ${isDone ? "rgba(16,185,129,0.35)" : isSkip ? "rgba(148,163,184,0.3)" : "var(--border)"}`,
                  background: isDone ? "rgba(16,185,129,0.05)" : isSkip ? "rgba(148,163,184,0.06)" : "var(--background)",
                  opacity: isSkip ? 0.6 : 1,
                }}>
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <span style={{
                      minWidth: 20, height: 20, borderRadius: 5,
                      background: isDone ? "rgba(16,185,129,0.15)" : "color-mix(in srgb, var(--primary) 12%, transparent)",
                      color: isDone ? "#10b981" : "var(--primary)", fontSize: 10, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>{isDone ? <i className="bi bi-check-lg" /> : idx + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.tenHang}
                      </p>
                      {item.inventoryItem?.code && (
                        <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                          {item.inventoryItem.code}
                        </p>
                      )}
                    </div>
                    {/* Badge trạng thái */}
                    {isDone && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.12)", padding: "2px 7px", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
                        ✓ Đã đặt
                      </span>
                    )}
                    {isSkip && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", background: "rgba(148,163,184,0.15)", padding: "2px 7px", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
                        Bỏ qua
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4, paddingLeft: 27 }}>
                    <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                      SL: <strong style={{ color: "var(--foreground)" }}>{item.soLuong}</strong>
                      {item.donVi ? ` ${item.donVi}` : ""}
                    </span>
                    {item.donGiaDK > 0 && (
                      <>
                        <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                          ĐG: <strong style={{ color: "var(--foreground)" }}>{fmtVnd(item.donGiaDK)}</strong>
                        </span>
                        <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginLeft: "auto" }}>
                          = <strong style={{ color: isDone ? "#10b981" : "var(--primary)" }}>{fmtVnd(item.soLuong * item.donGiaDK)}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Footer */}
        {currentStatus === "da-xu-ly" ? (
          /* Đã xử lý: khoá hoàn toàn */
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, background: "var(--muted)" }}>
            <i className="bi bi-lock-fill" style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "var(--muted-foreground)", fontStyle: "italic" }}>
              Phiếu đã ở trạng thái <strong style={{ color: s.color }}>{s.label}</strong> — không thể thực hiện thêm hành động.
            </span>
          </div>
        ) : currentStatus === "tu-choi" ? (
          /* Từ chối: khoá nhưng có thể kích hoạt lại */
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              <i className="bi bi-x-octagon-fill" style={{ fontSize: 13, color: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: "var(--muted-foreground)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Phiếu đã <strong style={{ color: s.color }}>bị từ chối</strong>
              </span>
            </div>
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              style={{ flexShrink: 0, padding: "7px 14px", border: "1px solid #10b981", background: "rgba(16,185,129,0.08)", color: "#10b981", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: reactivating ? "not-allowed" : "pointer", opacity: reactivating ? 0.6 : 1, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
            >
              {reactivating
                ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} />Đang xử lý...</>
                : <><i className="bi bi-arrow-counterclockwise" />Kích hoạt lại</>}
            </button>
          </div>
        ) : (
          /* Chưa / đang xử lý: hiện đầy đủ nút */
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <button
              onClick={handleReject}
              disabled={rejecting}
              style={{ flex: 1, padding: "8px", border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: rejecting ? "not-allowed" : "pointer", color: "var(--foreground)", opacity: rejecting ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              {rejecting
                ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} />Đang xử lý...</>
                : <><i className="bi bi-x-circle" />Từ chối</>}
            </button>
            <button
              onClick={() => detail && onCreateOrder?.(req.id, req.code, detail.items)}
              disabled={loading || !detail}
              style={{ flex: 1, padding: "8px", border: "none", background: "var(--primary)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (loading || !detail) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, opacity: (loading || !detail) ? 0.7 : 1 }}>
              <i className="bi bi-check2-all" />Tạo đơn mua
            </button>
          </div>
        )}
      </div>

    </>
  );
}
